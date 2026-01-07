import { PostCard } from "@/components/posts/post-card";
import { searchPosts } from "@/actions/search";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q || "";
  const results = query ? await searchPosts(query) : [];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold">Search</h1>
        {query && (
          <p className="mt-2 text-muted-foreground">
            Results for &quot;{query}&quot;
          </p>
        )}
      </div>

      {!query ? (
        <p className="text-muted-foreground">Enter a search term to find posts.</p>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground">No posts found matching your search.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {results.map(({ post, author }) => (
            <PostCard key={post.id} post={post} author={author} />
          ))}
        </div>
      )}
    </div>
  );
}
