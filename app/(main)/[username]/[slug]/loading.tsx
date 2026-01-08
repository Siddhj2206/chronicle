import { Skeleton } from "@/components/ui/skeleton";

export default function PostLoading() {
  return (
    <article className="mx-auto max-w-3xl pb-20">
      {/* Header Skeleton */}
      <header className="mb-12 border-b-4 border-black pb-8 text-center dark:border-white">
        <div className="mb-6 flex justify-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="mx-auto mb-6 h-16 w-3/4" />
        <Skeleton className="mx-auto h-8 w-2/3" />
      </header>

      {/* Cover Image Skeleton */}
      <Skeleton className="mb-12 aspect-[2/1] w-full" />

      {/* Content Skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Actions Skeleton */}
      <div className="mt-12 flex justify-center border-y border-border py-6">
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Author Bio Skeleton */}
      <footer className="mt-12 border-b border-border pb-12">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-32" />
        </div>
      </footer>
    </article>
  );
}
