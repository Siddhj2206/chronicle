import { feedResponse } from "@/lib/distribution";
import { cleanUsername } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
): Promise<Response> {
  const { username } = await params;
  const clean = cleanUsername(username);
  if (!clean) return new Response("Author not found", { status: 404 });
  return feedResponse(clean);
}
