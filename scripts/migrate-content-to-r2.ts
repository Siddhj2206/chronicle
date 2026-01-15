/**
 * Migration Script: Move blog content from PostgreSQL to R2
 * 
 * This script:
 * 1. Fetches all posts with content from the database
 * 2. Uploads each post's content to R2 as a markdown file
 * 3. Updates the database with the R2 path and search vector
 * 
 * Usage:
 *   bunx tsx scripts/migrate-content-to-r2.ts --dry-run  # Preview changes
 *   bunx tsx scripts/migrate-content-to-r2.ts            # Execute migration
 * 
 * Note: Ensure .env.local is present with required environment variables
 */

import { readFileSync, existsSync } from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, isNull } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Load environment variables from .env.local
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      const content = readFileSync(envFile, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}

loadEnv();

// Inline schema to avoid Next.js imports
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const post = pgTable(
  "post",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    content: text("content").notNull(),
    contentPath: text("content_path"),
    excerpt: text("excerpt"),
    coverImage: text("cover_image"),
    viewCount: integer("view_count").default(0).notNull(),
    published: boolean("published").default(false).notNull(),
    publishedAt: timestamp("published_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    searchVector: text("search_vector"),
  },
  (table) => [
    uniqueIndex("post_slug_idx").on(table.slug),
    index("post_author_idx").on(table.authorId),
    index("post_published_idx").on(table.published, table.publishedAt),
  ]
);

// Configuration
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 10;

// R2 client setup
function getR2Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials not set. Required: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY"
    );
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// Strip markdown for search indexing
function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Generate search vector text
function generateSearchVector(title: string, excerpt: string | null, content: string): string {
  const cleanContent = stripMarkdown(content);
  return [title, title, excerpt || "", cleanContent].join(" ");
}

async function main() {
  console.log("=".repeat(60));
  console.log("Chronicle Content Migration: PostgreSQL → R2");
  console.log("=".repeat(60));
  console.log();

  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No changes will be made\n");
  } else {
    console.log("⚠️  LIVE MODE - Changes will be applied\n");
  }

  // Validate environment
  const databaseUrl = process.env.DATABASE_URL;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  if (!bucketName) {
    console.error("❌ R2_BUCKET_NAME not set");
    process.exit(1);
  }

  console.log(`📦 R2 Bucket: ${bucketName}`);
  console.log(`🗄️  Database: ${databaseUrl.split("@")[1]?.split("/")[0] || "connected"}`);
  console.log();

  // Connect to database
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  // Get R2 client
  const r2 = getR2Client();

  try {
    // Fetch posts that need migration (no contentPath set)
    console.log("📊 Fetching posts to migrate...");
    
    const postsToMigrate = await db
      .select({
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt,
        contentPath: post.contentPath,
      })
      .from(post)
      .where(isNull(post.contentPath));

    console.log(`   Found ${postsToMigrate.length} posts without R2 content\n`);

    if (postsToMigrate.length === 0) {
      console.log("✅ All posts already migrated!");
      await client.end();
      return;
    }

    // Process in batches
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < postsToMigrate.length; i += BATCH_SIZE) {
      const batch = postsToMigrate.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(postsToMigrate.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} posts)...`);

      for (const postData of batch) {
        const contentKey = `content/${postData.id}.md`;
        const searchVector = generateSearchVector(
          postData.title,
          postData.excerpt,
          postData.content
        );

        try {
          if (DRY_RUN) {
            console.log(`   [DRY] Would upload: ${contentKey} (${postData.content.length} bytes)`);
            console.log(`         Title: "${postData.title.substring(0, 50)}..."`);
          } else {
            // Upload to R2
            await r2.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: contentKey,
                Body: postData.content,
                ContentType: "text/markdown; charset=utf-8",
              })
            );

            // Update database
            await db
              .update(post)
              .set({
                contentPath: contentKey,
                searchVector: searchVector,
              })
              .where(eq(post.id, postData.id));

            console.log(`   ✓ Migrated: ${postData.slug}`);
          }

          successCount++;
        } catch (error) {
          console.error(`   ✗ Failed: ${postData.slug}`, error);
          errorCount++;
        }
      }

      console.log();
    }

    // Summary
    console.log("=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));
    console.log(`✓ Successful: ${successCount}`);
    console.log(`✗ Failed: ${errorCount}`);
    console.log(`Total: ${postsToMigrate.length}`);
    console.log();

    if (DRY_RUN) {
      console.log("🔍 This was a dry run. Run without --dry-run to apply changes.");
    } else if (errorCount === 0) {
      console.log("✅ Migration completed successfully!");
    } else {
      console.log("⚠️  Migration completed with errors. Please review.");
    }

    // Verification
    if (!DRY_RUN) {
      console.log("\n📊 Verifying migration...");
      
      const remainingCount = await db
        .select({ id: post.id })
        .from(post)
        .where(isNull(post.contentPath));

      if (remainingCount.length === 0) {
        console.log("   ✓ All posts have contentPath set");
      } else {
        console.log(`   ⚠️  ${remainingCount.length} posts still without contentPath`);
      }
    }

  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
