import { Masthead } from "@/components/magazine/masthead";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Masthead />
      <main className="flex-1 w-full mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
