import Link from "next/link";

import { NotFoundView } from "@/components/layout/not-found-view";

export default function NotFound(): React.JSX.Element {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto min-h-screen max-w-7xl px-6 py-8"
    >
      <Link href="/" className="font-serif text-4xl tracking-tight">
        Chronicle
      </Link>
      <NotFoundView
        title="Page Not Found"
        description="This page is no longer here, or has yet to be written. There are other stories waiting for you."
      />
    </main>
  );
}
