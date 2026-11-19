import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

interface MarkdownNode {
  type: string;
  value?: string;
  alt?: string | null;
  depth?: number;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
}

export interface ArticleHeading {
  id: string;
  text: string;
  level: number;
}

function textContent(node: MarkdownNode): string {
  if (node.type === "html") return "";
  return (
    node.value ?? node.alt ?? node.children?.map(textContent).join("") ?? ""
  );
}

function assignHeadingIds(tree: MarkdownNode): ArticleHeading[] {
  const used = new Set<string>(["theme-toggle"]);
  const headings: ArticleHeading[] = [];
  function visit(node: MarkdownNode): void {
    if (node.type === "heading") {
      const text = textContent(node);
      const slug =
        text
          .toLowerCase()
          .normalize("NFKC")
          .replace(/[^\p{L}\p{N}\s-]/gu, "")
          .trim()
          .replace(/\s+/g, "-") || "section";
      let id = slug;
      let suffix = 1;
      while (used.has(id)) id = `${slug}-${suffix++}`;
      used.add(id);
      node.data = {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id },
      };
      if (node.depth === 2 || node.depth === 3) {
        headings.push({ id, text, level: node.depth });
      }
    }
    node.children?.forEach(visit);
  }
  visit(tree);
  return headings;
}

export function remarkHeadingIds(): (tree: MarkdownNode) => void {
  return (tree) => {
    assignHeadingIds(tree);
  };
}

export function analyzeReading(markdown: string): {
  minutes: number;
  headings: ArticleHeading[];
} {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
  let words = 0;
  function count(node: MarkdownNode): void {
    if (node.type === "html" || node.type === "definition") return;
    if (node.value || node.alt) {
      words +=
        (node.value ?? node.alt ?? "").match(
          /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu,
        )?.length ?? 0;
    }
    node.children?.forEach(count);
  }
  count(tree);
  return {
    minutes: Math.max(1, Math.ceil(words / 230)),
    headings: assignHeadingIds(tree),
  };
}
