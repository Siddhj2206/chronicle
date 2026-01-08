import Link from "next/link";

import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  sort: string;
}

export function Pagination({ currentPage, totalPages, sort }: PaginationProps) {
  // Generate page numbers to show (e.g., 1 2 3 ... 10)
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];

    if (totalPages <= 7) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Show first, last, current, and neighbors with ellipsis
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="mt-12 flex items-center justify-center gap-2 border-t border-black pt-8 dark:border-white">
      {/* Previous */}
      {currentPage > 1 ? (
        <Link
          href={`/archive?page=${currentPage - 1}&sort=${sort}`}
          className="font-mono text-xs uppercase tracking-widest hover:underline"
        >
          ← Prev
        </Link>
      ) : (
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          ← Prev
        </span>
      )}

      {/* Page Numbers */}
      <div className="flex items-center gap-1 px-4">
        {pageNumbers.map((page, i) =>
          page === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="px-2 text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <Link
              key={page}
              href={`/archive?page=${page}&sort=${sort}`}
              className={cn(
                "min-w-[2rem] px-2 py-1 text-center font-mono text-xs uppercase tracking-widest",
                page === currentPage
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "hover:underline"
              )}
            >
              {page}
            </Link>
          )
        )}
      </div>

      {/* Next */}
      {currentPage < totalPages ? (
        <Link
          href={`/archive?page=${currentPage + 1}&sort=${sort}`}
          className="font-mono text-xs uppercase tracking-widest hover:underline"
        >
          Next →
        </Link>
      ) : (
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Next →
        </span>
      )}
    </nav>
  );
}
