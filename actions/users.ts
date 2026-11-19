"use server";

import { eq } from "drizzle-orm";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { post, user } from "@/lib/db/schema";
import { usernameSchema, profileSchema, imageUrlSchema } from "@/lib/validators";
import { deleteUserObjects } from "@/lib/r2";
import { revalidatePosts } from "@/lib/revalidate-posts";

function isUsernameConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (
    "code" in error && error.code === "23505" &&
    "constraint_name" in error && error.constraint_name === "user_username_unique"
  ) return true;
  return "cause" in error && isUsernameConflict(error.cause);
}

export async function checkUsernameAvailable(
  username: string
): Promise<{ available: boolean; error?: string }> {
  try {
    const parsed = usernameSchema.safeParse(username);

    if (!parsed.success) {
      return { available: false, error: parsed.error.issues[0].message };
    }

    const existing = await db.query.user.findFirst({
      where: eq(user.username, username.toLowerCase()),
    });

    return { available: !existing };
  } catch (error) {
    console.error("Check username error:", error);
    return { available: false, error: "Failed to check username availability" };
  }
}

export async function setUsername(
  username: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = usernameSchema.safeParse(username);

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const normalizedUsername = username.toLowerCase();

    // Check if username is taken
    const existing = await db.query.user.findFirst({
      where: eq(user.username, normalizedUsername),
    });

    if (existing && existing.id !== session.user.id) {
      return { success: false, error: "Username is already taken" };
    }

    // Update user
    await db
      .update(user)
      .set({
        username: normalizedUsername,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    await revalidatePosts(session.user.id);

    return { success: true };
  } catch (error) {
    console.error("Set username error:", error);
    return { success: false, error: isUsernameConflict(error)
      ? "Username is already taken" : "Failed to set username" };
  }
}

export async function updateProfile(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const data = {
      name: formData.get("name") as string,
      username: (formData.get("username") as string) || undefined,
      bio: (formData.get("bio") as string) || undefined,
      image: (formData.get("image") as string) || undefined,
    };

    const parsed = profileSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    // Get current user data
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!currentUser) {
      return { success: false, error: "User not found" };
    }

    const oldUsername = currentUser.username;
    const newUsername = parsed.data.username?.toLowerCase();

    // Check if username is being changed
    if (newUsername && newUsername !== oldUsername) {
      // Check if new username is available
      const existingUser = await db.query.user.findFirst({
        where: eq(user.username, newUsername),
      });

      if (existingUser) {
        return { success: false, error: "Username is already taken" };
      }

      // Update user with new data including username
      await db
        .update(user)
        .set({
          name: parsed.data.name,
          username: newUsername,
          bio: parsed.data.bio || null,
          image: parsed.data.image || null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, session.user.id));
    } else {
      // No username change, just update other fields
      await db
        .update(user)
        .set({
          name: parsed.data.name,
          bio: parsed.data.bio || null,
          image: parsed.data.image || null,
          updatedAt: new Date(),
        })
        .where(eq(user.id, session.user.id));
    }

    await revalidatePosts(session.user.id, { usernames: oldUsername ? [oldUsername] : [] });
    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: isUsernameConflict(error)
      ? "Username is already taken" : "Failed to update profile" };
  }
}

export async function updateAvatar(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const parsed = imageUrlSchema.safeParse(imageUrl);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await db
      .update(user)
      .set({
        image: parsed.data,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id));

    await revalidatePosts(session.user.id);

    return { success: true };
  } catch (error) {
    console.error("Update avatar error:", error);
    return { success: false, error: "Failed to update avatar" };
  }
}

export async function deleteAccount(
  confirmationUsername: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Get current user
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!currentUser) {
      return { success: false, error: "User not found" };
    }

    // Verify username confirmation
    if (currentUser.username !== confirmationUsername.toLowerCase()) {
      return { success: false, error: "Username does not match" };
    }

    const posts = await db.select({ id: post.id, slug: post.slug, contentPath: post.contentPath })
      .from(post).where(eq(post.authorId, session.user.id));
    // Delete user from database (cascades handle related records)
    const [deletedUser] = await db.delete(user).where(eq(user.id, session.user.id)).returning();
    if (!deletedUser) return { success: false, error: "User not found" };

    await deleteUserObjects(session.user.id, posts.flatMap(({ contentPath }) => contentPath ? [contentPath] : []));
    await revalidatePosts(session.user.id, {
      posts,
      usernames: currentUser.username ? [currentUser.username] : [],
      contentChanged: true,
    });

    return { success: true };
  } catch (error) {
    console.error("Delete account error:", error);
    return { success: false, error: "Failed to delete account" };
  }
}
