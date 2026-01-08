import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Fetch full user data including bio
  const userData = await db
    .select()
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!userData) {
    redirect("/sign-in");
  }

  return (
    <div>
      <SettingsForm
        user={{
          id: userData.id,
          name: userData.name || null,
          username: userData.username || null,
          bio: userData.bio || null,
          image: userData.image || null,
        }}
      />
    </div>
  );
}
