import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMyPosts } from "@/actions/posts";

export default async function DashboardPage() {
  const posts = await getMyPosts();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold">My Posts</h1>
        <Button asChild>
          <Link href="/new">New Post</Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">No posts yet</CardTitle>
            <CardDescription>
              Create your first post to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/new">Create Post</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="transition-all duration-200 hover:-translate-y-1 hover:rotate-1 hover:shadow-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-serif text-lg font-medium">
                    {post.title}
                  </CardTitle>
                  <Badge variant={post.published ? "default" : "secondary"}>
                    {post.published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <CardDescription>
                  {post.publishedAt
                    ? `Published on ${new Date(post.publishedAt).toLocaleDateString()}`
                    : `Created on ${new Date(post.createdAt).toLocaleDateString()}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/edit/${post.slug}`}>Edit</Link>
                  </Button>
                  {post.published && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/@${post.slug}`}>View</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
