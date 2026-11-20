import { Skeleton } from "@/components/ui/skeleton";

function Lines(): React.JSX.Element {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function StoryRows(): React.JSX.Element {
  return (
    <div className="space-y-8">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(0,1fr)_80px] gap-6 border-b border-border py-8 sm:grid-cols-[minmax(0,1fr)_144px]"
        >
          <Lines />
          <Skeleton className="aspect-square w-full self-center" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({
  layout,
}: {
  layout: "home" | "article" | "profile" | "archive";
}): React.JSX.Element {
  const label =
    layout === "article"
      ? "Loading story"
      : layout === "profile"
        ? "Loading profile"
        : layout === "archive"
          ? "Loading archive"
          : "Loading journal";
  return (
    <div
      role="status"
      aria-label={label}
      className="mx-auto max-w-[1180px] pb-16 [&_[data-slot=skeleton]]:rounded-none motion-reduce:[&_[data-slot=skeleton]]:animate-none"
    >
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true">
        {layout === "article" ? (
          <>
            <div className="grid gap-6 py-10 md:grid-cols-[1fr_3fr] md:py-16">
              <div className="space-y-6 md:col-start-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            </div>
            <Skeleton className="mb-12 aspect-[2/1] w-full md:ml-[8.333%] md:w-[91.667%]" />
            <div className="grid gap-12 xl:grid-cols-[240px_minmax(0,1fr)]">
              <Skeleton className="h-24 w-full" />
              <div className="max-w-[680px] space-y-10">
                {[0, 1, 2].map((index) => (
                  <Lines key={index} />
                ))}
              </div>
            </div>
          </>
        ) : layout === "profile" ? (
          <>
            <div className="mx-auto mb-12 flex max-w-4xl flex-col items-center gap-6 border-b border-border py-12">
              <Skeleton className="size-32" />
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-2/3" />
            </div>
            <div className="mx-auto max-w-4xl">
              <StoryRows />
            </div>
          </>
        ) : layout === "archive" ? (
          <div className="mx-auto max-w-4xl">
            <div className="mb-12 space-y-6 border-b border-border pb-8">
              <Skeleton className="h-16 w-48" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <StoryRows />
          </div>
        ) : (
          <>
            <div className="space-y-5 pb-12">
              <Skeleton className="h-16 w-2/3" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="grid items-center gap-8 border-t border-border pt-8 md:grid-cols-[1.35fr_1fr]">
              <Skeleton className="aspect-[3/2] w-full" />
              <Lines />
            </div>
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              {[0, 1].map((index) => (
                <div key={index} className="space-y-6">
                  <Skeleton className="aspect-[3/2] w-full" />
                  <Lines />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
