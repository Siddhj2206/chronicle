export function safeCallbackUrl(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  ) {
    return "/";
  }

  const url = new URL(value, "https://callback.invalid");
  if (url.pathname.startsWith("//")) {
    return "/";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
