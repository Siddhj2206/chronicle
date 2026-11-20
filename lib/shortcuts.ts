export type ShortcutAction = "search" | "home" | "new" | "help" | "prefix";

export function shortcutAction(
  key: string,
  signedIn: boolean,
  followsG: boolean,
): ShortcutAction | undefined {
  if (key === "/") return "search";
  if (key === "?") return "help";
  const letter = key.toLowerCase();
  if (letter === "g") return "prefix";
  if (letter === "h" && followsG) return "home";
  if ((letter === "n" || letter === "c") && signedIn) return "new";
  return undefined;
}
