import { cache } from "react";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const getAuth = cache(async () => betterAuth({
  database: drizzleAdapter(await getDb(), {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
      bio: {
        type: "string",
        required: false,
      },
    },
  },
}));

export type Session = Awaited<ReturnType<typeof getAuth>>["$Infer"]["Session"];
