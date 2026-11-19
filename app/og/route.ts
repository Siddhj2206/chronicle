import { socialImage } from "@/lib/og-image";

export function GET(): Response {
  return socialImage(
    "Stories and ideas, thoughtfully shared.",
    "Share your perspective.",
  );
}
