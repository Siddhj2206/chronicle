import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { getPost, getPostContent, incrementViewCount } from "@/actions/posts";
import { getLikeCount, hasUserLiked } from "@/actions/likes";
import { PostContent } from "@/components/posts/post-content";
import { TagChips } from "@/components/posts/tag-chips";
import { ArticleContents } from "@/components/posts/article-contents";
import { ReadingProgress } from "@/components/posts/reading-progress";
import { LikeButton } from "@/components/posts/post-actions";
import { CommentList } from "@/components/comments/comment-list";
import { CommentForm } from "@/components/comments/comment-form";
import { getSession } from "@/lib/session";
import { getFollowInfo } from "@/actions/follows";
import { FollowButton } from "@/components/auth/follow-button";
import { analyzeReading } from "@/lib/reading";

import type { Metadata } from "next";
import type { ReactElement } from "react";

interface PostPageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { username, slug } = await params;
  const decodedUsername = decodeURIComponent(username).replace("@", "");
  const result = await getPost(decodedUsername, slug);

  if (!result) {
    return {
      title: "Post Not Found",
    };
  }

  const { post, author } = result;

  return {
    title: `${post.title} | The Chronicle`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt || "",
      type: "article",
      url: `/@${author.username}/${post.slug}`,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: PostPageProps): Promise<ReactElement> {
  const { username, slug } = await params;
  const decodedUsername = decodeURIComponent(username).replace("@", "");
  const result = await getPost(decodedUsername, slug);

  if (!result) {
    notFound();
  }

  const { post, author } = result;

  // Fetch content from R2 and like data in parallel
  const [content, likeCount, userLiked, session, followInfo] =
    await Promise.all([
      getPostContent(post.id),
      getLikeCount(post.id),
      hasUserLiked(post.id),
      getSession(),
      getFollowInfo(author.id),
    ]);

  // Track view (fire and forget - don't await)
  incrementViewCount(post.id);

  // Use R2 content, fallback to DB content if not available
  const postContent = content || post.content;
  const { minutes, headings } = analyzeReading(postContent);

  return (
    <article className="reader">
      <ReadingProgress />
      {/* Article Header */}
      <header className="grid gap-x-12 gap-y-6 py-10 md:grid-cols-[1fr_3fr] md:py-16">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[13px] leading-relaxed text-muted-foreground md:col-start-2">
          <Link
            href={`/@${author.username}`}
            className="hover:text-foreground hover:underline"
          >
            {author.name}
          </Link>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt?.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
          <span>{minutes} min read</span>
        </div>

        <h1 className="max-w-[900px] font-serif text-[40px] leading-[1.02] tracking-tight [overflow-wrap:anywhere] md:col-start-2 md:text-[72px]">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="max-w-[680px] text-lg leading-relaxed text-muted-foreground md:col-start-2 md:text-xl">
            {post.excerpt}
          </p>
        )}
        {!!post.tags?.length && (
          <div className="md:col-start-2">
            <TagChips tags={post.tags} />
          </div>
        )}
      </header>

      {/* Cover Image (if exists) */}
      {post.coverImage && (
        <figure className="mb-12 md:mb-20 md:ml-[8.333%]">
          <div className="story-cover !aspect-[2/1]">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 1200px) 100vw, 1180px"
              className="object-cover"
              priority
            />
          </div>
          <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Image credit: {author.name}
          </figcaption>
        </figure>
      )}

      {!post.coverImage && (
        <div className="reader-cover-initial" aria-hidden="true">
          <span className="title-initial">
            {Array.from(post.title.trim())[0]?.toLocaleUpperCase("en-US") ||
              "C"}
          </span>
        </div>
      )}

      {/* Article Content */}
      <div className="grid xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-12">
        <ArticleContents headings={headings} />
        <div className="min-w-0 xl:col-start-2">
          <div data-reading-body className="max-w-[680px]">
            <PostContent content={postContent} />
          </div>

          {/* Post Actions */}
          <div className="mt-12 max-w-[680px] border-y border-border py-6">
            <LikeButton
              postId={post.id}
              initialLiked={userLiked}
              initialCount={likeCount}
            />
          </div>

          {/* Article Footer / Author Bio */}
          <footer className="reader-author max-w-[680px]">
            {author.image && (
              <div className="reader-author-image">
                <Image
                  src={author.image}
                  alt={author.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            )}
            <div>
              <div className="reader-author-label">Written By</div>
              <h2>
                <Link href={`/@${author.username}`} className="hover:underline">
                  {author.name}
                </Link>
              </h2>
            </div>
            <FollowButton
              authorId={author.id}
              viewerId={followInfo.viewerId}
              initialFollowing={followInfo.isFollowing}
            />
          </footer>

          {/* Comments Section */}
          <section className="reader-comments max-w-[680px]">
            <h2>Reader notes</h2>
            <div className="mb-10">
              <CommentForm
                postId={post.id}
                isLoggedIn={!!session?.user?.id}
                articlePath={`/@${encodeURIComponent(decodedUsername)}/${encodeURIComponent(slug)}`}
              />
            </div>
            <CommentList postId={post.id} postAuthorId={author.id} />
          </section>
        </div>
      </div>
    </article>
  );
}
