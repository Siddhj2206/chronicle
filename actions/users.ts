"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { usernameSchema, profileSchema } from "@/lib/validators";
import { getR2, R2_BUCKET_NAME } from "@/lib/r2";

export async function checkUsernameAvailable(
  username: string
): Promise<{ available: boolean; error?: string }> {
  const parsed = usernameSchema.safeParse(username);

  if (!parsed.success) {
    return { available: false, error: parsed.error.issues[0].message };
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.username, username.toLowerCase()),
  });

  return { available: !existing };
}

export async function setUsername(
  username: string
): Promise<{ success: boolean; error?: string }> {
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

  if (existing) {
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

  revalidatePath("/");

  return { success: true };
}

export async function updateProfile(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
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

    revalidatePath("/");
    revalidatePath("/settings");
    if (oldUsername) {
      revalidatePath(`/@${oldUsername}`);
    }
    revalidatePath(`/@${newUsername}`);
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

    revalidatePath("/settings");
    if (oldUsername) {
      revalidatePath(`/@${oldUsername}`);
    }
  }

  return { success: true };
}

export async function updateAvatar(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  await db
    .update(user)
    .set({
      image: imageUrl,
      updatedAt: new Date(),
    })
    .where(eq(user.id, session.user.id));

  const username = (session.user as { username?: string }).username;
  revalidatePath("/settings");
  if (username) {
    revalidatePath(`/@${username}`);
  }

  return { success: true };
}

export async function deleteAccount(
  confirmationUsername: string
): Promise<{ success: boolean; error?: string }> {
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

  // Delete all R2 objects for this user
  try {
    const r2 = getR2();
    const prefix = `uploads/${session.user.id}/`;

    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
    });

    const listResponse = await r2.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: {
          Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
        },
      });

      await r2.send(deleteCommand);
    }
  } catch (error) {
    // Log error but continue with deletion
    console.error("Failed to delete R2 objects:", error);
  }

  // Delete user from database (cascades handle related records)
  await db.delete(user).where(eq(user.id, session.user.id));

  revalidatePath("/");

  return { success: true };
}
