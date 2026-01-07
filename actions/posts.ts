"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc } from "drizzle-orm";
import slugify from "slugify";
import { nanoid } from "nanoid";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { post, user } from "@/lib/db/schema";
import { postSchema } from "@/lib/validators";

import type { Post } from "@/lib/db/schema";

export async function createPost(formData: FormData) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") || undefined,
    coverImage: formData.get("coverImage") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, content, excerpt, coverImage } = parsed.data;

  // Generate unique slug
  const baseSlug = slugify(title, { lower: true, strict: true });
  const slug = `${baseSlug}-${nanoid(6)}`;

  try {
    const [newPost] = await db
      .insert(post)
      .values({
        authorId: session.user.id,
        title,
        slug,
        content,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        published: false,
      })
      .returning();

    revalidatePath("/dashboard");

    return { success: true, slug: newPost.slug };
  } catch (error) {
    console.error("Create post error:", error);
    return { error: "Failed to create post" };
  }
}

export async function updatePost(slug: string, formData: FormData) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = postSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    excerpt: formData.get("excerpt") || undefined,
    coverImage: formData.get("coverImage") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { title, content, excerpt, coverImage } = parsed.data;

  try {
    const [updatedPost] = await db
      .update(post)
      .set({
        title,
        content,
        excerpt: excerpt || null,
        coverImage: coverImage || null,
        updatedAt: new Date(),
      })
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!updatedPost) {
      return { error: "Post not found" };
    }

    const username = (session.user as { username?: string }).username;
    revalidatePath("/dashboard");
    revalidatePath(`/@${username}/${slug}`);

    return { success: true, slug: updatedPost.slug };
  } catch (error) {
    console.error("Update post error:", error);
    return { error: "Failed to update post" };
  }
}

export async function deletePost(slug: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const [deletedPost] = await db
      .delete(post)
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!deletedPost) {
      return { error: "Post not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Delete post error:", error);
    return { error: "Failed to delete post" };
  }
}

export async function publishPost(slug: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const [publishedPost] = await db
      .update(post)
      .set({
        published: true,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!publishedPost) {
      return { error: "Post not found" };
    }

    const username = (session.user as { username?: string }).username;
    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath(`/@${username}/${slug}`);

    return { success: true };
  } catch (error) {
    console.error("Publish post error:", error);
    return { error: "Failed to publish post" };
  }
}

export async function unpublishPost(slug: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    const [unpublishedPost] = await db
      .update(post)
      .set({
        published: false,
        updatedAt: new Date(),
      })
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .returning();

    if (!unpublishedPost) {
      return { error: "Post not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Unpublish post error:", error);
    return { error: "Failed to unpublish post" };
  }
}

// Query functions

export async function getPost(
  username: string,
  slug: string
): Promise<{ post: Post; author: { id: string; name: string; username: string | null; image: string | null } } | null> {
  try {
    const result = await db
      .select({
        post: post,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(and(eq(post.slug, slug), eq(user.username, username)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error("Get post error:", error);
    return null;
  }
}

export async function getPostForEdit(slug: string): Promise<Post | null> {
  const session = await getSession();

  if (!session?.user?.id) {
    return null;
  }

  try {
    const result = await db
      .select()
      .from(post)
      .where(and(eq(post.slug, slug), eq(post.authorId, session.user.id)))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("Get post for edit error:", error);
    return null;
  }
}

export async function getPostsByUser(username: string) {
  try {
    const result = await db
      .select({
        post: post,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(and(eq(user.username, username), eq(post.published, true)))
      .orderBy(desc(post.publishedAt));

    return result;
  } catch (error) {
    console.error("Get posts by user error:", error);
    return [];
  }
}

export async function getMyPosts() {
  const session = await getSession();

  if (!session?.user?.id) {
    return [];
  }

  try {
    const result = await db
      .select()
      .from(post)
      .where(eq(post.authorId, session.user.id))
      .orderBy(desc(post.createdAt));

    return result;
  } catch (error) {
    console.error("Get my posts error:", error);
    return [];
  }
}

export async function getNewestPosts(limit = 10, offset = 0) {
  try {
    const result = await db
      .select({
        post: post,
        author: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      })
      .from(post)
      .innerJoin(user, eq(post.authorId, user.id))
      .where(eq(post.published, true))
      .orderBy(desc(post.publishedAt))
      .limit(limit)
      .offset(offset);

    return result;
  } catch (error) {
    console.error("Get newest posts error:", error);
    return [];
  }
}
