import { redirect } from "next/navigation";
import Link from "next/link";

import { getSession } from "@/lib/session";
import { SignInButton } from "@/components/auth/sign-in-button";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getSession();
  const { callbackUrl = "/" } = await searchParams;

  if (session?.user) {
    const username = (session.user as { username?: string }).username;
    if (!username) {
      redirect(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    redirect(callbackUrl);
  }

  return (
    <div className="w-full max-w-md p-4">
      <div className="relative border-4 border-black bg-white p-8 text-center dark:border-white dark:bg-black">
        {/* Hole Punch Effect */}
        <div className="absolute -top-6 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full border-4 border-black bg-background dark:border-white" />

        <div className="mb-8 mt-4">
          <Link href="/" className="inline-block">
             <h1 className="font-serif text-3xl font-black tracking-tight hover:underline">
              The Chronicle
            </h1>
          </Link>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Est. 2026 • Worldwide
          </p>
        </div>

        <div className="mb-8 space-y-4 border-y-2 border-black py-8 dark:border-white">
          <h2 className="font-sans text-xl font-bold uppercase tracking-widest">
            Press Access
          </h2>
          <p className="font-serif text-lg italic text-muted-foreground">
            &quot;Please present your credentials to enter the newsroom.&quot;
          </p>
        </div>

        <SignInButton callbackURL={callbackUrl} />

        <div className="mt-8 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Authorized Personnel Only
        </div>
      </div>
    </div>
  );
}
