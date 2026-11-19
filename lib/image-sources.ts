export const imageRemotePatterns = [
  { protocol: "https", hostname: "images.unsplash.com", port: "" },
  { protocol: "https", hostname: "lh3.googleusercontent.com", port: "" },
  { protocol: "https", hostname: "**.r2.cloudflarestorage.com", port: "" },
  { protocol: "https", hostname: "**.r2.dev", port: "" },
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
