import { unstable_cache, updateTag } from "next/cache";
import { nanoid } from "nanoid";

import { getR2 } from "@/lib/r2";

// Content path prefix in R2 bucket
const CONTENT_PREFIX = "content";

/**
 * Generate the R2 key (path) for a post's content
 */
export function getContentKey(postId: string): string {
  return `${CONTENT_PREFIX}/${postId}/${nanoid()}.md`;
}

/**
 * Upload markdown content to R2
 * @param postId - The post's unique ID
 * @param markdown - The markdown content to store
 * @returns The R2 path where content was stored
 */
export async function uploadContent(
  postId: string,
  markdown: string,
): Promise<string> {
  const key = getContentKey(postId);
  const r2 = await getR2();
  await r2.put(key, markdown, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
  });

  return key;
}

/**
 * Delete content from R2
 * @param contentPath - The stored R2 key
 */
export async function deleteContent(contentPath: string): Promise<void> {
  try {
    const r2 = await getR2();
    await r2.delete(contentPath);
  } catch (error) {
    // Best-effort cleanup can leave orphan objects after an outage or process exit.
    console.error(`Failed to delete content ${contentPath}:`, error);
  }
}

/**
 * Fetch raw content from R2 (uncached)
 * @param contentPath - The stored R2 key
 * @returns The markdown content or null if not found
 */
async function fetchContentFromR2(contentPath: string): Promise<string | null> {
  const r2 = await getR2();
  const response = await r2.get(contentPath);
  return response ? response.text() : null;
}

/**
 * Get content with Next.js caching
 * Uses unstable_cache with tag-based revalidation
 * @param postId - The post's unique ID
 * @returns The markdown content or null if not found
 */
export async function getContent(
  postId: string,
  contentPath: string,
): Promise<string | null> {
  // Create a cached version of the fetch function
  const getCachedContent = unstable_cache(
    async () => fetchContentFromR2(contentPath),
    [`post-content-${postId}`, contentPath],
    {
      tags: [`post-content-${postId}`],
      revalidate: false, // Only revalidate via tag
    },
  );

  try {
    return await getCachedContent();
  } catch (error) {
    console.error(`Failed to fetch content ${contentPath}:`, error);
    return null;
  }
}

/**
 * Revalidate the content cache for a specific post
 * Call this after updating content
 * @param postId - The post's unique ID
 */
export async function revalidateContent(postId: string): Promise<void> {
  updateTag(`post-content-${postId}`);
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
export function generateSearchVectorSQL(
  title: string,
  excerpt: string | null,
  content: string,
): string {
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
  return (
    markdown
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
      .trim()
  );
}
