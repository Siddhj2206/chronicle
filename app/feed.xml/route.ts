import { feedResponse } from "@/lib/distribution";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return feedResponse();
}
