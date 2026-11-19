import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Checkbox } from "@/components/ui/checkbox";
import { highlightCode } from "@/lib/highlight-code";

import type { Components } from "react-markdown";

// Hoisted style objects to prevent recreation on every render
const imageStyle = { width: "100%", height: "auto" };

const articleStyle = {
  fontFamily: "var(--font-serif)",
  fontSize: "1.25rem",
  lineHeight: 1.875,
};

// Hoisted outside component to prevent recreation on every render
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-2 mt-6 font-serif text-4xl font-bold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-6 font-serif text-3xl font-bold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 font-serif text-2xl font-bold">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-6 font-serif text-xl font-bold">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="mb-2 mt-6 font-serif text-lg font-bold">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="mb-2 mt-6 font-serif text-base font-bold">{children}</h6>
  ),
  p: ({ children }) => <p className="mb-4">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline hover:text-foreground"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mb-4 list-disc pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-4 list-decimal pl-6">{children}</ol>
  ),
  li: ({ children }) => <li className="mb-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-border pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-border" />,
  img: ({ src, alt }) => (
    <span className="my-4 block">
      <Image
        src={String(src || "")}
        alt={String(alt || "")}
        width={800}
        height={400}
        className="border border-border"
        style={imageStyle}
      />
    </span>
  ),
  code: ({ children }) => (
    <code className="bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
      {children}
    </code>
  ),
  pre: ({ node }) => {
    const code = node?.children[0];
    if (code?.type !== "element" || code.tagName !== "code") return null;
    const classes = code.properties.className;
    const language = Array.isArray(classes)
      ? classes.find((name) => String(name).startsWith("language-"))
      : undefined;
    const text = code.children
      .map((child) => child.type === "text" ? child.value : "")
      .join("")
      .replace(/\n$/, "");
    return (
      <div
        className="my-4 overflow-x-auto [&_pre]:min-w-max [&_pre]:border [&_pre]:border-border [&_pre]:!bg-muted [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[0.9em] [&_pre]:leading-[1.5] [&_code]:font-mono"
        dangerouslySetInnerHTML={{
          __html: highlightCode(text, language ? String(language).slice(9) : undefined),
        }}
      />
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-border px-4 py-2 text-left font-bold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-4 py-2">{children}</td>
  ),
  input: ({ type, checked }) => {
    if (type === "checkbox") {
      return (
        <Checkbox
          checked={checked}
          disabled
          className="mr-2 h-4 w-4 rounded-none border-neutral-400 data-[state=checked]:bg-black data-[state=checked]:text-white dark:data-[state=checked]:bg-white dark:data-[state=checked]:text-black"
        />
      );
    }
    return null;
  },
};

interface PostContentProps {
  content: string;
}

export function PostContent({ content }: PostContentProps) {
  return (
    <article className="post-content" style={articleStyle}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
