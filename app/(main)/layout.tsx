import { Navbar } from "@/components/magazine/navbar";
import { Footer } from "@/components/magazine/footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      data-public-page
      className="min-h-screen flex flex-col pb-[var(--article-actions-height,0px)] md:pb-0"
    >
      <Navbar />
      <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
