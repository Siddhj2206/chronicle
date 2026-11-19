import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { getPost, getPostContent, incrementViewCount } from "@/actions/posts";
import { getLikeCount, hasUserLiked } from "@/actions/likes";
import { PostContent } from "@/components/posts/post-content";
import { LikeButton } from "@/components/posts/post-actions";
import { CommentList } from "@/components/comments/comment-list";
import { CommentForm } from "@/components/comments/comment-form";
import { getSession } from "@/lib/session";
import { TagChips } from "@/components/posts/tag-chips";

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
  const [content, likeCount, userLiked, session] = await Promise.all([
    getPostContent(post.id),
    getLikeCount(post.id),
    hasUserLiked(post.id),
    getSession(),
  ]);

  // Track view (fire and forget - don't await)
  incrementViewCount(post.id);

  // Use R2 content, fallback to DB content if not available
  const postContent = content || post.content;

  return (
    <article className="reader">
      {/* Article Header */}
      <header className="reader-header">
        <div className="reader-meta">
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
        </div>

        <h1 className="reader-title">{post.title}</h1>

        {post.excerpt && <p className="reader-deck">{post.excerpt}</p>}
        <div className="mt-4">
          <TagChips tags={post.tags} />
        </div>
      </header>

      {/* Cover Image (if exists) */}
      {post.coverImage && (
        <figure className="reader-cover">
          <div className="story-cover">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 1200px) 100vw, 1180px"
              className="object-cover"
              priority
            />
          </div>
          <figcaption>Image Credit: {author.name}</figcaption>
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
      <div className="reader-column">
        <PostContent content={postContent} />
      </div>

      {/* Post Actions */}
      <div className="reader-actions reader-column">
        <LikeButton
          postId={post.id}
          initialLiked={userLiked}
          initialCount={likeCount}
        />
      </div>

      {/* Article Footer / Author Bio */}
      <footer className="reader-author reader-column">
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
      </footer>

      {/* Comments Section */}
      <section className="reader-comments reader-column">
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
    </article>
  );
}
