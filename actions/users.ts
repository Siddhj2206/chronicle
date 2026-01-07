"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { usernameSchema, profileSchema } from "@/lib/validators";

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
    bio: (formData.get("bio") as string) || undefined,
  };

  const parsed = profileSchema.safeParse(data);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await db
    .update(user)
    .set({
      name: parsed.data.name,
      bio: parsed.data.bio || null,
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
