import { $isParagraphNode, $isTextNode } from "lexical";

import type { LexicalNode, ParagraphNode } from "lexical";

export function $isEmptyWritingParagraph(
  node: LexicalNode | null,
): node is ParagraphNode {
  return (
    $isParagraphNode(node) &&
    node
      .getChildren()
      .every((child) => $isTextNode(child) && !child.getTextContent().trim())
  );
}
