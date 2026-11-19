import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/lib/auth";

export async function GET(request: Request): Promise<Response> {
  return toNextJsHandler(await getAuth()).GET(request);
}

export async function POST(request: Request): Promise<Response> {
  return toNextJsHandler(await getAuth()).POST(request);
}
