export function readingTimeMinutes(markdown: string): number {
  const withoutCode = markdown
    .replace(/^\s*((`|~)\2{2,})[^\n]*\n[\s\S]*?^\s*\1\2*\s*$/gm, " ")
    .replace(/`+([^`]*?)`+/g, "$1");
  let images = 0;
  const text = withoutCode
    .replace(/!\[[^\]]*\](?:\([^\n]*?\)|\[[^\]]*\])?/g, () => {
      images++;
      return " ";
    })
    .replace(/<img\b[^>]*>/gi, () => {
      images++;
      return " ";
    })
    .replace(/^\s*\[[^\]]+\]:\s+.*$/gm, " ")
    .replace(/\[([^\]]+)\](?:\([^)]*\)|\[[^\]]*\])/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_~>|`\[\]{}\\]/g, " ")
    .replace(/^\s*(?:[-+] |\d+[.)] )/gm, " ");
  const words =
    text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / 238 + (images * 12) / 60));
}
