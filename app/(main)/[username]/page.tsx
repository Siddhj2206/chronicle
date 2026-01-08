import { notFound } from "next/navigation";
import Image from "next/image";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { getPostsByUser } from "@/actions/posts";
import { ListCard } from "@/components/magazine/list-card";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  if (!username) {
    notFound();
  }

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

  return (
    <div className="mx-auto max-w-4xl pb-12">
      {/* Profile Header - Classic Masthead Style */}
      <div className="mb-16 border-b-4 border-black pb-12 text-center dark:border-white">
        {userData.image && (
          <div className="mx-auto mb-6 h-32 w-32 overflow-hidden border border-neutral-300 dark:border-neutral-700">
             <Image
              src={userData.image}
              alt={userData.name}
              width={128}
              height={128}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        
        <h1 className="mb-2 font-serif text-4xl font-black tracking-tight md:text-5xl">
          {userData.name}
        </h1>
        <p className="mb-6 font-sans text-sm font-bold uppercase tracking-widest text-muted-foreground">
          @{userData.username}
        </p>
        
        {userData.bio && (
          <div className="mx-auto max-w-xl">
            <p className="font-serif text-lg italic leading-relaxed text-muted-foreground">
              {userData.bio}
            </p>
          </div>
        )}
      </div>

      {/* Posts Section */}
      <div>
        <div className="mb-8 flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-black dark:bg-white" />
            <span className="font-sans text-xs font-black uppercase tracking-widest text-muted-foreground">
              Published Work
            </span>
            <div className="h-px w-12 bg-black dark:bg-white" />
        </div>

        {posts.length === 0 ? (
           <div className="py-12 text-center font-serif text-lg italic text-muted-foreground">
            This author has not published any stories yet.
          </div>
        ) : (
          <div className="flex flex-col gap-12 divide-y divide-neutral-200 dark:divide-neutral-800">
            {posts.map(({ post, author }) => (
              <ListCard 
                key={post.id} 
                post={{ ...post, author }} 
                className="pt-12 first:pt-0" 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
