import { notFound } from "next/navigation";

import { getTagPosts } from "@/actions/tags";
import { ListCard } from "@/components/magazine/list-card";
import { Pagination } from "@/components/archive/pagination";

export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug: encodedSlug } = await params;
  let slug: string;
  try {
    slug = decodeURIComponent(encodedSlug);
  } catch {
    notFound();
  }
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Math.min(100000, parseInt(rawPage || "1", 10) || 1));
  const result = await getTagPosts(slug, page);
  if (!result) notFound();
  if ("error" in result)
    return <p role="alert">Unable to load stories. Please try again.</p>;
  return (
    <div className="mx-auto max-w-4xl pb-12">
      <header className="mb-10 space-y-3 border-b border-border pb-8">
        <h1 className="font-serif text-4xl md:text-5xl">{result.tag.name}</h1>
        <p className="text-muted-foreground">
          {result.totalCount} {result.totalCount === 1 ? "story" : "stories"}
        </p>
      </header>
      <div className="space-y-10">
        {result.posts.map(({ post, author }) => (
          <ListCard key={post.id} post={{ ...post, author }} />
        ))}
        {!result.posts.length && (
          <p className="text-muted-foreground">No stories here yet.</p>
        )}
      </div>
      {result.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={result.totalPages}
          basePath={`/tag/${encodeURIComponent(slug)}`}
        />
      )}
    </div>
  );
}
