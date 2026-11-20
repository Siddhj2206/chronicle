import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { eq } from "drizzle-orm";

import { getPostsByUser } from "@/actions/posts";
import { HeroCard } from "@/components/magazine/hero-card";
import { ListCard } from "@/components/magazine/list-card";
import { ProfileTabs } from "@/components/magazine/profile-tabs";
import { getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { profileStories, profileTab } from "@/lib/profile";
import { getSession } from "@/lib/session";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}

export default async function ProfilePage({
  params,
  searchParams,
}: ProfilePageProps): Promise<React.JSX.Element> {
  const db = await getDb();
  const { username } = await params;
  if (!username) notFound();
  const cleanUsername = username.startsWith("%40")
    ? username.slice(3)
    : username.startsWith("@")
      ? username.slice(1)
      : username;
  const [userData, posts, session, query] = await Promise.all([
    db
      .select()
      .from(user)
      .where(eq(user.username, cleanUsername))
      .limit(1)
      .then((rows) => rows[0]),
    getPostsByUser(cleanUsername),
    getSession(),
    searchParams,
  ]);
  if (!userData) notFound();
  const activeTab = profileTab(query?.tab);
  const { featured, remaining, count } = profileStories(posts);
  const joined = (
    <time dateTime={userData.createdAt.toISOString()}>
      {userData.createdAt.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })}
    </time>
  );

  return (
    <div className="mx-auto max-w-[1120px] pb-16">
      <header className="grid gap-7 pb-10 pt-4 md:grid-cols-[160px_minmax(0,1fr)] md:gap-12 md:pb-14">
        <div className="relative flex size-24 items-center justify-center overflow-hidden bg-muted font-serif text-6xl text-primary md:size-40 md:text-8xl">
          {userData.image ? (
            <Image
              src={userData.image}
              alt={userData.name}
              fill
              sizes="(max-width: 767px) 96px, 160px"
              priority
              className="object-cover"
            />
          ) : (
            <span aria-hidden="true">
              {Array.from(userData.name.trim())[0] || "C"}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-[48px] leading-[1] tracking-tight [overflow-wrap:anywhere] md:text-[80px]">
            {userData.name}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            @{userData.username}
          </p>
          {userData.bio && (
            <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed md:text-lg">
              {userData.bio}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span>Joined {joined}</span>
            <span>
              {count} {count === 1 ? "story" : "stories"}
            </span>
          </div>
          <div
            data-profile-actions
            className="mt-5 flex flex-wrap gap-4 text-sm"
          >
            {session?.user.id === userData.id && (
              <Link
                href="/settings"
                className="underline underline-offset-4 hover:text-primary"
              >
                Edit profile
              </Link>
            )}
          </div>
        </div>
      </header>
      <ProfileTabs activeTab={activeTab} username={cleanUsername} />
      <section
        id={`profile-panel-${activeTab === "home" ? "about" : "home"}`}
        role="tabpanel"
        aria-labelledby={`profile-tab-${activeTab === "home" ? "about" : "home"}`}
        hidden
      />
      <section
        id={`profile-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`profile-tab-${activeTab}`}
        tabIndex={0}
        className="pt-8 md:pt-12"
      >
        {activeTab === "about" ? (
          <div className="max-w-[680px] pb-12">
            <h2 className="font-serif text-4xl">About {userData.name}</h2>
            <p className="mt-6 whitespace-pre-line text-lg leading-relaxed">
              {userData.bio || "This writer has not added a bio yet."}
            </p>
            <p className="mt-8 text-sm text-muted-foreground">
              Joined {joined}
            </p>
          </div>
        ) : featured ? (
          <>
            <section aria-label="Featured story" className="mb-10 md:mb-14">
              <p className="mb-5 text-xs text-muted-foreground">Featured</p>
              <HeroCard
                post={{ ...featured.post, author: featured.author }}
                className="!border-t-0 !pt-0"
              />
            </section>
            {remaining.length > 0 && (
              <section aria-label="Published stories" className="max-w-[800px]">
                <h2 className="font-serif text-3xl">More stories</h2>
                {remaining.map(({ post, author }) => (
                  <ListCard
                    key={post.id}
                    post={{ ...post, author }}
                    layout="feed"
                  />
                ))}
              </section>
            )}
          </>
        ) : (
          <div className="py-12">
            <h2 className="font-serif text-4xl">No stories yet.</h2>
            <p className="mt-4 text-sm text-muted-foreground">
              This author has not published any stories yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
