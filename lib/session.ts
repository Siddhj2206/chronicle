import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";

export async function getSession() {
  return (await getAuth()).api.getSession({
    headers: await headers(),
  });
}
