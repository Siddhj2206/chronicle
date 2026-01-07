import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPost } from "@/actions/posts";
import { PostContent } from "@/components/posts/post-content";
import type { Metadata } from "next";

interface PostPageProps {
  params: Promise<{
    username: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
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

export default async function PostPage({ params }: PostPageProps) {
  const { username, slug } = await params;
  const decodedUsername = decodeURIComponent(username).replace("@", "");
  const result = await getPost(decodedUsername, slug);

  if (!result) {
    notFound();
  }

  const { post, author } = result;

  return (
    <article className="mx-auto max-w-3xl pb-20">
      {/* Article Header */}
      <header className="mb-12 border-b-4 border-black pb-8 text-center dark:border-white">
        <div className="mb-6 flex justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Link href={`/@${author.username}`} className="hover:text-foreground hover:underline">
            {author.name}
          </Link>
          <span>•</span>
          <Link href="/culture" className="hover:text-foreground hover:underline">
            Culture
          </Link>
          <span>•</span>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt?.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </time>
        </div>

        <h1 className="mb-6 font-serif text-5xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mx-auto max-w-2xl font-serif text-xl italic leading-relaxed text-muted-foreground md:text-2xl">
            {post.excerpt}
          </p>
        )}
      </header>

      {/* Cover Image (if exists) */}
      {post.coverImage && (
        <figure className="mb-12">
          <div className="relative aspect-[3/2] w-full overflow-hidden border border-border">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
          <figcaption className="mt-2 text-center font-sans text-xs uppercase tracking-widest text-muted-foreground">
            Image Credit: {author.name}
          </figcaption>
        </figure>
      )}

      {/* Article Content */}
      <div className="prose prose-lg prose-neutral dark:prose-invert mx-auto font-serif prose-headings:font-bold prose-headings:tracking-tight prose-p:leading-loose">
        <PostContent content={post.content} />
      </div>

      {/* Article Footer / Author Bio */}
      <footer className="mt-16 border-t border-border pt-12">
        <div className="flex flex-col items-center gap-4 text-center">
          {author.image && (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border">
              <Image
                src={author.image}
                alt={author.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <div className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Written By
            </div>
            <h3 className="font-serif text-2xl font-bold">
              <Link href={`/@${author.username}`} className="hover:underline">
                {author.name}
              </Link>
            </h3>
          </div>
        </div>
      </footer>
    </article>
  );
}
