import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { unstable_cache, revalidateTag } from "next/cache";

import { getR2, R2_BUCKET_NAME } from "@/lib/r2";

// Content path prefix in R2 bucket
const CONTENT_PREFIX = "content";

/**
 * Generate the R2 key (path) for a post's content
 */
export function getContentKey(postId: string): string {
  return `${CONTENT_PREFIX}/${postId}.md`;
}

/**
 * Upload markdown content to R2
 * @param postId - The post's unique ID
 * @param markdown - The markdown content to store
 * @returns The R2 path where content was stored
 */
export async function uploadContent(postId: string, markdown: string): Promise<string> {
  const key = getContentKey(postId);
  const r2 = getR2();

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: markdown,
      ContentType: "text/markdown; charset=utf-8",
    })
  );

  return key;
}

/**
 * Delete content from R2
 * @param postId - The post's unique ID
 */
export async function deleteContent(postId: string): Promise<void> {
  const key = getContentKey(postId);
  const r2 = getR2();

  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    // Log but don't throw - content may not exist
    console.error(`Failed to delete content for post ${postId}:`, error);
  }
}

/**
 * Fetch raw content from R2 (uncached)
 * @param postId - The post's unique ID
 * @returns The markdown content or null if not found
 */
async function fetchContentFromR2(postId: string): Promise<string | null> {
  const key = getContentKey(postId);
  const r2 = getR2();

  try {
    const response = await r2.send(
      new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );

    if (!response.Body) {
      return null;
    }

    // Convert stream to string
    const content = await response.Body.transformToString();
    return content;
  } catch (error) {
    // Check if it's a "not found" error
    if (error instanceof Error && error.name === "NoSuchKey") {
      return null;
    }
    console.error(`Failed to fetch content for post ${postId}:`, error);
    return null;
  }
}

/**
 * Get content with Next.js caching
 * Uses unstable_cache with tag-based revalidation
 * @param postId - The post's unique ID
 * @returns The markdown content or null if not found
 */
export async function getContent(postId: string): Promise<string | null> {
  // Create a cached version of the fetch function
  const getCachedContent = unstable_cache(
    async () => fetchContentFromR2(postId),
    [`post-content-${postId}`],
    {
      tags: [`post-content-${postId}`],
      revalidate: false, // Only revalidate via tag
    }
  );

  return getCachedContent();
}

/**
 * Revalidate the content cache for a specific post
 * Call this after updating content
 * @param postId - The post's unique ID
 */
export async function revalidateContent(postId: string): Promise<void> {
  // Second argument is the cache profile/duration - use "default" for immediate revalidation
  revalidateTag(`post-content-${postId}`, "default");
}

/**
 * Generate a search vector string from post content
 * This creates a weighted tsvector for PostgreSQL full-text search
 * Title gets weight A (highest), excerpt gets B, content gets C
 * 
 * @param title - Post title
 * @param excerpt - Post excerpt (can be null)
 * @param content - Post markdown content
 * @returns SQL-ready tsvector expression
 */
export function generateSearchVectorSQL(title: string, excerpt: string | null, content: string): string {
  // Escape single quotes for SQL safety
  const escapeSQL = (str: string) => str.replace(/'/g, "''");
  
  const safeTitle = escapeSQL(title);
  const safeExcerpt = escapeSQL(excerpt || "");
  // Strip markdown syntax for cleaner text search
  const safeContent = escapeSQL(stripMarkdown(content));

  return `
    setweight(to_tsvector('english', '${safeTitle}'), 'A') ||
    setweight(to_tsvector('english', '${safeExcerpt}'), 'B') ||
    setweight(to_tsvector('english', '${safeContent}'), 'C')
  `.trim();
}

/**
 * Strip common markdown syntax for cleaner search indexing
 */
function stripMarkdown(markdown: string): string {
  return markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code
    .replace(/`[^`]+`/g, "")
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, "")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove headers markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    // Remove blockquote markers
    .replace(/^>\s+/gm, "")
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}
