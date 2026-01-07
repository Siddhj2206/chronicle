import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PostCard } from "@/components/posts/post-card";
import { getPostsByUser } from "@/actions/posts";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  // Remove @ prefix if present
  const cleanUsername = username.startsWith("%40")
    ? username.slice(3)
    : username.startsWith("@")
      ? username.slice(1)
      : username;

  const userData = await db
    .select()
    .from(user)
    .where(eq(user.username, cleanUsername))
    .limit(1)
    .then((rows) => rows[0]);

  if (!userData) {
    notFound();
  }

  const posts = await getPostsByUser(cleanUsername);

  const initials = userData.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      {/* Profile Header */}
      <div className="flex items-start gap-6">
        <Avatar className="h-20 w-20">
          <AvatarImage src={userData.image || undefined} />
          <AvatarFallback className="text-2xl">{initials || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-serif text-2xl font-semibold">{userData.name}</h1>
          <p className="text-muted-foreground">@{userData.username}</p>
          {userData.bio && (
            <p className="mt-3 max-w-lg text-muted-foreground">{userData.bio}</p>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* Posts Section */}
      <div>
        <h2 className="mb-6 font-serif text-xl font-medium">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {posts.map(({ post, author }) => (
              <PostCard key={post.id} post={post} author={author} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
