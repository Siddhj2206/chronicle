import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { post, user } from "@/lib/db/schema";

import type { Post, User } from "@/lib/db/schema";

export function assertTestDatabase(): void {
  const url = process.env.DATABASE_URL;
  if (!url || !new URL(url).pathname.endsWith("_test")) {
    throw new Error("DATABASE_URL must point to a disposable database whose name ends in _test");
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDb();
  assertTestDatabase();
  await db.execute(sql`TRUNCATE TABLE "user", verification CASCADE`);
}

export async function createUser(overrides: Partial<User> = {}): Promise<User> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const [created] = await db.insert(user).values({
    id, name: "Test Writer", email: `${id}@example.test`, emailVerified: true,
    username: `u_${id.replaceAll("-", "").slice(0, 12)}`,
    createdAt: new Date("2025-01-01"), updatedAt: new Date("2025-01-01"),
    ...overrides,
  }).returning();
  return created;
}

export async function createPost(authorId: string, overrides: Partial<Post> = {}): Promise<Post> {
  const db = await getDb();
  const [created] = await db.insert(post).values({
    authorId, title: "Chronicle testing", slug: `post-${crypto.randomUUID()}`,
    content: "A reproducible story for readers.", published: true,
    publishedAt: new Date("2025-01-02"), ...overrides,
  }).returning();
  return created;
}

export function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
