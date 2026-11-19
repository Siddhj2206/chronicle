import Link from "next/link";
import { redirect } from "next/navigation";

import { getFollowingPosts } from "@/actions/follows";
import { Pagination } from "@/components/archive/pagination";
import { ListCard } from "@/components/magazine/list-card";

interface FollowingPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function FollowingPage({ searchParams }: FollowingPageProps) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Math.min(100000, parseInt(pageParam || "1", 10) || 1));
  const result = await getFollowingPosts({ page });
  if ("error" in result && result.error === "Unauthorized") redirect("/sign-in?callbackUrl=%2Ffollowing");

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <header className="mb-12 border-b border-border pb-8">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">Following</h1>
        <p className="mt-4 text-lg text-muted-foreground">The latest stories from the writers you follow.</p>
      </header>
      {"error" in result ? (
        <p role="alert" className="py-12 text-center font-serif text-lg">Unable to load your feed. Please try again.</p>
      ) : result.posts.length === 0 ? (
        <div className="space-y-4 py-12 text-center">
          <p className="font-serif text-xl text-muted-foreground">{result.totalCount ? "No more stories on this page." : "You’re not following any writers yet."}</p>
          <p className="font-serif text-muted-foreground">Follow writers from their profiles to bring their published stories here.</p>
          <Link href={result.totalCount ? "/following" : "/archive"} className="inline-block underline underline-offset-4">
            {result.totalCount ? "Back to the latest stories" : "Discover writers in the archive"}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-12">
          {result.posts.map(({ post, author }) => <ListCard key={post.id} post={{ ...post, author }} />)}
        </div>
      )}
      {!("error" in result) && result.totalPages > 1 && (
        <Pagination currentPage={result.currentPage} totalPages={result.totalPages} basePath="/following" />
      )}
    </div>
  );
}
