import { redirect } from "next/navigation";

import { getSession } from "@/lib/session";
import { SignInButton } from "@/components/auth/sign-in-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SignInPage() {
  const session = await getSession();

  if (session?.user) {
    const username = (session.user as { username?: string }).username;
    if (!username) {
      redirect("/onboarding");
    }
    redirect("/dashboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Chronicle</CardTitle>
        <CardDescription>
          Sign in to start writing and sharing your stories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignInButton />
      </CardContent>
    </Card>
  );
}
