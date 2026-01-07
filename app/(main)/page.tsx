import { PostCard } from "@/components/posts/post-card";
import { getNewestPosts } from "@/actions/posts";

export default async function FeedPage() {
  const posts = await getNewestPosts(20);

  return (
    <div>
      <h1 className="mb-8 font-serif text-3xl font-semibold">Latest Posts</h1>

      {posts.length === 0 ? (
        <p className="text-muted-foreground">No posts yet. Be the first to write!</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map(({ post, author }) => (
            <PostCard key={post.id} post={post} author={author} />
          ))}
        </div>
      )}
    </div>
  );
}
