import { getPublicArticle } from "@/lib/distribution";
import { socialImage } from "@/lib/og-image";
import { cleanUsername } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string; slug: string }> },
): Promise<Response> {
  try {
    const { username, slug } = await params;
    const article = await getPublicArticle(cleanUsername(username), slug);
    if (!article) return new Response("Article not found", { status: 404 });
    return socialImage(article.post.title, article.author.name);
  } catch (error) {
    console.error("Article social image error:", error);
    return new Response("Image temporarily unavailable", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
