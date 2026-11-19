import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Checkbox } from "@/components/ui/checkbox";
import { highlightCode } from "@/lib/highlight-code";
import { remarkHeadingIds } from "@/lib/reading";

import type { Components } from "react-markdown";

// Hoisted style objects to prevent recreation on every render
const imageStyle = { width: "100%", height: "auto" };

// Hoisted outside component to prevent recreation on every render
const markdownComponents: Components = {
  h1: ({ children, id }) => (
    <h1 id={id} className="scroll-mt-28 !mb-4 !mt-14 !text-[44px]">
      {children}
    </h1>
  ),
  h2: ({ children, id }) => (
    <h2 id={id} className="scroll-mt-28 !mb-4 !mt-14 !text-[38px]">
      {children}
    </h2>
  ),
  h3: ({ children, id }) => (
    <h3 id={id} className="scroll-mt-28 !mb-3 !mt-10 !text-[30px]">
      {children}
    </h3>
  ),
  h4: ({ children, id }) => (
    <h4 id={id} className="scroll-mt-28 !mb-3 !mt-10">
      {children}
    </h4>
  ),
  h5: ({ children, id }) => (
    <h5 id={id} className="scroll-mt-28 !mb-3 !mt-10">
      {children}
    </h5>
  ),
  h6: ({ children, id }) => (
    <h6 id={id} className="scroll-mt-28 !mb-3 !mt-10">
      {children}
    </h6>
  ),
  p: ({ children, node }) => {
    if (
      node?.children.some(
        (child) => child.type === "element" && child.tagName === "img",
      )
    ) {
      return <div className="my-10">{children}</div>;
    }
    return <p>{children}</p>;
  },
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
  ul: ({ children }) => <ul className="mb-4 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="!my-10 border-l !border-primary pl-6 font-serif text-[28px] italic leading-snug !text-foreground [&>p:last-child]:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-border" />,
  img: ({ src, alt, title }) => (
    <figure className="my-10 w-full md:w-[min(920px,calc(100vw-64px))] xl:w-[min(920px,calc(100vw-352px))]">
      <Image
        src={String(src || "")}
        alt={String(alt || "")}
        width={960}
        height={600}
        sizes="(max-width: 768px) 100vw, 920px"
        style={imageStyle}
      />
      {(title || alt) && (
        <figcaption className="mt-3 font-sans text-xs leading-relaxed text-muted-foreground">
          {title || alt}
        </figcaption>
      )}
    </figure>
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
      .map((child) => (child.type === "text" ? child.value : ""))
      .join("")
      .replace(/\n$/, "");
    return (
      <div
        className="my-8 overflow-x-auto border border-border [&_pre]:min-w-max [&_pre]:!bg-card [&_pre]:p-5 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed [&_code]:font-mono"
        dangerouslySetInnerHTML={{
          __html: highlightCode(
            text,
            language ? String(language).slice(9) : undefined,
          ),
        }}
      />
    );
  },
  table: ({ children }) => (
    <div className="my-8 overflow-x-auto">
      <table className="w-full border-collapse text-base leading-relaxed">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-4 py-3 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-4 py-3 align-top">{children}</td>
  ),
  input: ({ type, checked }) => {
    if (type === "checkbox") {
      return <Checkbox checked={checked} disabled />;
    }
    return null;
  },
};

interface PostContentProps {
  content: string;
}

export function PostContent({ content }: PostContentProps): React.JSX.Element {
  return (
    <div className="post-content !text-[20px] !leading-[1.65] [&>:first-child]:!mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkHeadingIds]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
