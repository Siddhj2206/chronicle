import { NextRequest, NextResponse } from "next/server";

const authRoutes = ["/sign-in"];
const onboardingRoute = "/onboarding";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get session token from cookie
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const isLoggedIn = !!sessionToken;

  // For username check, we'll handle this in the page components
  // since we can't easily query the database in proxy

  const isAuthRoute = authRoutes.includes(pathname);
  const isOnboarding = pathname === onboardingRoute;
  const isDashboard =
    pathname.startsWith("/manuscripts") ||
    pathname === "/new" ||
    pathname.startsWith("/edit") ||
    pathname === "/settings";

  // Redirect logged-in users away from auth routes
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/manuscripts", request.url));
  }

  // Protect dashboard routes
  if (isDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Protect onboarding route
  if (isOnboarding && !isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}
