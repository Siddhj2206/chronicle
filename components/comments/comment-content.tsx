"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { Components } from "react-markdown";

// Lightweight markdown components for comments - no syntax highlighting
const commentComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
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
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  code: ({ children }) => (
    <code className="bg-muted px-1 py-0.5 font-mono text-sm">{children}</code>
  ),
  // Keep comments simple - no headings, lists, code blocks, etc.
};

interface CommentContentProps {
  content: string;
}

export function CommentContent({ content }: CommentContentProps) {
  return (
    <div className="comment-content text-base leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={commentComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
