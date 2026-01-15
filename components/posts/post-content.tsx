interface PostContentProps {
  content: string;
}

/**
 * Renders pre-rendered HTML content from the server.
 * The markdown is already converted to HTML with syntax highlighting
 * via the unified/rehype/shiki pipeline in lib/markdown.ts.
 *
 * Styles are defined in globals.css under .prose-chronicle
 */
export function PostContent({ content }: PostContentProps) {
  return (
    <article
      className="prose-chronicle"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
