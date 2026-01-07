import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostCard } from "@/components/posts/post-card";
import { Navbar } from "@/components/layout/navbar";
import { getNewestPosts } from "@/actions/posts";

export default async function HomePage() {
  const posts = await getNewestPosts(6);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-24 pb-16">
          {/* Hero Section */}
          <section className="flex flex-col items-center gap-8 pt-8 text-center md:pt-16">
            <h1 className="max-w-3xl font-serif text-4xl font-semibold tracking-tight md:text-5xl">
              Share your stories with the world
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Write, publish, and connect with readers who care about what you have
              to say. Your words deserve an audience.
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg">
                <Link href="/sign-in">Start Writing</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#latest">Read Stories</Link>
              </Button>
            </div>
          </section>

          {/* Features Section */}
          <section className="flex flex-col gap-8">
            <h2 className="text-center font-serif text-2xl font-medium md:text-3xl">
              Why Chronicle?
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif font-medium">Markdown Editor</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Write with a powerful markdown editor featuring live preview and
                    syntax highlighting.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif font-medium">Engage Readers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Build your audience with likes, comments, and a personalized
                    profile page.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif font-medium">Share Anywhere</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Each post gets a clean, shareable URL. Your content, accessible
                    to everyone.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Latest Posts Section */}
          <section id="latest" className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-medium md:text-3xl">Latest Stories</h2>
              <Button asChild variant="ghost">
                <Link href="/search">View All</Link>
              </Button>
            </div>

            {posts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-12">
                  <p className="text-muted-foreground">
                    No stories yet. Be the first to share yours!
                  </p>
                  <Button asChild>
                    <Link href="/sign-in">Start Writing</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {posts.map(({ post, author }) => (
                  <PostCard key={post.id} post={post} author={author} />
                ))}
              </div>
            )}
          </section>

          {/* CTA Section */}
          <section className="flex flex-col items-center gap-6 rounded-lg border bg-muted/50 px-4 py-16 text-center">
            <h2 className="font-serif text-2xl font-medium md:text-3xl">
              Ready to share your story?
            </h2>
            <p className="text-muted-foreground">
              Join Chronicle today and start writing.
            </p>
            <Button asChild size="lg">
              <Link href="/sign-in">Get Started</Link>
            </Button>
          </section>
        </div>
      </main>
    </div>
  );
}
