import { Navbar } from "@/components/magazine/navbar";
import { Footer } from "@/components/magazine/footer";
import { BookmarkProvider } from "@/components/posts/bookmark-provider";
import { getBookmarkViewer } from "@/lib/bookmarks";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const viewer = await getBookmarkViewer();
  return (
    <BookmarkProvider viewer={viewer}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
    </BookmarkProvider>
  );
}
