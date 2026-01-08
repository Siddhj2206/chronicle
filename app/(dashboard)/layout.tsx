import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getSession } from "@/lib/session";
import { Navbar } from "@/components/magazine/navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";

  if (!session?.user) {
    const callbackUrl = encodeURIComponent(pathname);
    redirect(`/sign-in${callbackUrl ? `?callbackUrl=${callbackUrl}` : ""}`);
  }

  const username = (session.user as { username?: string }).username;
  if (!username) {
    const callbackUrl = encodeURIComponent(pathname);
    redirect(`/onboarding${callbackUrl ? `?callbackUrl=${callbackUrl}` : ""}`);
  }

  return (
    <div className="min-h-screen">
      <Navbar className="sticky top-0 z-50" />
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}
