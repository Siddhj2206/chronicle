import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { Navbar } from "@/components/magazine/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const username = (session.user as { username?: string }).username;
  if (!username) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen">
      <Navbar className="sticky top-0 z-50" />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
