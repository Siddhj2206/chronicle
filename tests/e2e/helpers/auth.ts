import { createHmac, randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { session, user } from "@/lib/db/schema";
import { assertTestDatabase, createUser } from "@/tests/helpers/db";

import type { BrowserContext } from "@playwright/test";
import type { User } from "@/lib/db/schema";

export async function signIn(
  context: BrowserContext,
  overrides: Partial<User> = {},
): Promise<User> {
  assertTestDatabase();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET must be set in .env.test");
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const secure = new URL(baseURL).protocol === "https:";
  const writer = await createUser(overrides);
  const token = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  try {
    const db = await getDb();
    await db.insert(session).values({
      id: randomUUID(),
      userId: writer.id,
      token,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });
    const signature = createHmac("sha256", secret)
      .update(token)
      .digest("base64");
    await context.addCookies([
      {
        name: `${secure ? "__Secure-" : ""}better-auth.session_token`,
        value: encodeURIComponent(`${token}.${signature}`),
        url: baseURL,
        httpOnly: true,
        secure,
        sameSite: "Lax",
        expires: Math.floor(expiresAt.getTime() / 1000),
      },
    ]);
    return writer;
  } catch (error) {
    await deleteTestUser(writer.id);
    throw error;
  }
}

export async function deleteTestUser(id: string): Promise<void> {
  assertTestDatabase();
  const db = await getDb();
  await db.delete(user).where(eq(user.id, id));
}
