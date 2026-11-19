import { $isParagraphNode, $isTextNode } from "lexical";

import type { LexicalNode } from "lexical";

export function $isEmptyWritingParagraph(node: LexicalNode | null): boolean {
  return (
    $isParagraphNode(node) &&
    node
      .getChildren()
      .every((child) => $isTextNode(child) && !child.getTextContent().trim())
  );
}
