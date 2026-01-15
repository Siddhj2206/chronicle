"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Checkbox } from "@/components/ui/checkbox";

import type { Components } from "react-markdown";

// Lazy load SyntaxHighlighter to reduce initial bundle size (~200KB savings)
const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  {
    loading: () => (
      <div className="my-4 h-24 animate-pulse bg-muted p-4" />
    ),
    ssr: false,
  }
);

// Hoisted style objects to prevent recreation on every render
const imageStyle = { width: "100%", height: "auto" };

const codeBlockCustomStyle = {
  margin: 0,
  padding: "1rem",
  background: "var(--muted)",
  borderRadius: 0,
  fontSize: "0.9em",
  lineHeight: 1.5,
};

const codeTagStyle = {
  fontFamily: "var(--font-mono)",
};

const articleStyle = {
  fontFamily: "Libre Baskerville, serif",
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
  code: ({ className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || "");
    const codeString = String(children).replace(/\n$/, "");

    // Check if it's an inline code or code block
    const isInline = !match && !className;

    if (isInline) {
      return (
        <code
          className="bg-muted px-1.5 py-0.5 font-mono text-[0.9em]"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="my-4 overflow-x-auto">
        <SyntaxHighlighter
          language={match?.[1] || "text"}
          PreTag="div"
          className="!min-w-max !border !border-border !bg-muted !font-mono"
          style={{}}
          customStyle={codeBlockCustomStyle}
          codeTagProps={{
            style: codeTagStyle,
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    );
  },
  pre: ({ children }) => <>{children}</>,
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
