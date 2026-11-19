import Link from "next/link";
import { redirect } from "next/navigation";

import { getFollowingPosts } from "@/actions/follows";
import { Pagination } from "@/components/archive/pagination";
import { ListCard } from "@/components/magazine/list-card";

import type { ReactElement } from "react";

interface FollowingPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function FollowingPage({
  searchParams,
}: FollowingPageProps): Promise<ReactElement> {
  const { page: pageParam } = await searchParams;
  const page = Math.max(
    1,
    Math.min(100000, parseInt(pageParam || "1", 10) || 1),
  );
  const result = await getFollowingPosts({ page });
  if ("error" in result && result.error === "Unauthorized")
    redirect("/sign-in?callbackUrl=%2Ffollowing");

  return (
    <div className="catalogue">
      <header className="catalogue-intro">
        <h1>Following</h1>
        <p>The latest stories from the writers you follow.</p>
      </header>
      {"error" in result ? (
        <p role="alert" className="catalogue-empty text-muted-foreground">
          Unable to load your feed. Please try again.
        </p>
      ) : result.posts.length === 0 ? (
        <div className="catalogue-empty space-y-4">
          <h2>
            {result.totalCount
              ? "No more stories on this page."
              : "You’re not following any writers yet."}
          </h2>
          <p className="text-muted-foreground">
            Follow writers from their profiles to bring their published stories
            here.
          </p>
          <Link
            href={result.totalCount ? "/following" : "/archive"}
            className="site-signin inline-block underline underline-offset-4"
          >
            {result.totalCount
              ? "Back to the latest stories"
              : "Discover writers in the archive"}
          </Link>
        </div>
      ) : (
        <div className="catalogue-entries">
          {result.posts.map(({ post, author }) => (
            <ListCard key={post.id} post={{ ...post, author }} />
          ))}
        </div>
      )}
      {!("error" in result) && result.totalPages > 1 && (
        <Pagination
          currentPage={result.currentPage}
          totalPages={result.totalPages}
          basePath="/following"
        />
      )}
    </div>
  );
}
