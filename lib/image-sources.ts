function getR2ImagePattern() {
  const domain = process.env.NEXT_PUBLIC_R2_DOMAIN;
  if (!domain) return undefined;
  try {
    const host = domain.replace(/^https?:\/\//, "");
    if (host.includes("://")) return undefined;
    const url = new URL(`https://${host}`);
    if (url.username || url.password || url.hostname.includes("*"))
      return undefined;
    return {
      protocol: "https" as const,
      hostname: url.hostname,
      port: url.port,
    };
  } catch {
    return undefined;
  }
}

const r2ImagePattern = getR2ImagePattern();

export const imageRemotePatterns = [
  { protocol: "https", hostname: "images.unsplash.com", port: "" },
  { protocol: "https", hostname: "lh3.googleusercontent.com", port: "" },
  { protocol: "https", hostname: "**.r2.cloudflarestorage.com", port: "" },
  { protocol: "https", hostname: "**.r2.dev", port: "" },
  ...(r2ImagePattern ? [r2ImagePattern] : []),
] satisfies { protocol: "https"; hostname: string; port: string }[];

export function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;

    return imageRemotePatterns.some((pattern) => {
      const hostnameMatches = pattern.hostname.startsWith("**.")
        ? url.hostname === pattern.hostname.slice(3) ||
          url.hostname.endsWith(pattern.hostname.slice(2))
        : url.hostname === pattern.hostname;

      return (
        url.protocol === `${pattern.protocol}:` &&
        url.port === pattern.port &&
        hostnameMatches
      );
    });
  } catch {
    return false;
  }
}
