import { ListCard } from "@/components/magazine/list-card";
import { searchPosts } from "@/actions/search";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q || "";
  const results = query ? await searchPosts(query) : [];

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-12 border-b-4 border-black pb-8 dark:border-white">
        <h1 className="font-serif text-4xl font-black tracking-tight md:text-5xl">
          Search
        </h1>
        {query && (
          <p className="mt-4 font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Showing results for <span className="text-foreground">&quot;{query}&quot;</span>
          </p>
        )}
      </div>

      {!query ? (
        <div className="py-12 text-center font-serif text-lg italic text-muted-foreground">
          Type above to search the archives…
        </div>
      ) : results.length === 0 ? (
        <div className="py-12 text-center font-serif text-lg italic text-muted-foreground">
          No stories found matching your query.
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {results.map(({ post, author }) => (
            <ListCard 
              key={post.id} 
              post={{ ...post, author }} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
