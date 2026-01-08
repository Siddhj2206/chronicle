import Link from "next/link";
import { getMyPosts } from "@/actions/posts";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const posts = await getMyPosts();

  return (
    <div className="mx-auto max-w-5xl pb-20">
      {/* Header */}
      <div className="mb-12 border-b-4 border-black pb-4 dark:border-white">
        <h1 className="font-serif text-5xl font-black tracking-tighter">
          Manuscripts
        </h1>
      </div>

      {posts.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif text-2xl italic text-muted-foreground">
            The ledger is empty.
          </p>
          <Link 
            href="/new" 
            className="mt-4 inline-block font-mono text-sm font-bold uppercase tracking-widest underline decoration-2 underline-offset-4"
          >
            Start Writing
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-black font-mono text-xs uppercase tracking-widest dark:border-white">
                <th className="py-4 pr-8 font-bold">Status</th>
                <th className="py-4 pr-8 font-bold">Date</th>
                <th className="py-4 pr-8 font-bold">Title</th>
                <th className="py-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {posts.map((post) => (
                <tr key={post.id} className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900">
                  <td className="whitespace-nowrap py-6 pr-8 align-top font-mono text-xs font-bold uppercase tracking-widest">
                    <span className={cn(
                      "inline-block rounded-none border px-2 py-0.5",
                      post.published 
                        ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" 
                        : "border-neutral-400 text-neutral-500"
                    )}>
                      {post.published ? "PUB" : "DFT"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-6 pr-8 align-top font-mono text-xs text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </td>
                  <td className="py-6 pr-8 align-top">
                    <Link href={`/edit/${post.slug}`} className="group-hover:underline">
                      <h3 className="font-serif text-xl font-bold leading-tight">
                        {post.title}
                      </h3>
                    </Link>
                    <p className="mt-2 line-clamp-1 font-serif text-sm italic text-muted-foreground">
                      {post.excerpt || "No excerpt..."}
                    </p>
                  </td>
                  <td className="whitespace-nowrap py-6 text-right align-top font-mono text-xs font-bold uppercase tracking-widest">
                     <Link href={`/edit/${post.slug}`} className="hover:underline">
                      [Edit]
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
