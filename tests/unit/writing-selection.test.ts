import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from "lexical";
import { describe, expect, it } from "vitest";

import { $createImageNode, ImageNode } from "@/components/posts/lexical-editor";
import { $isEmptyWritingParagraph } from "@/lib/writing-selection";

describe("empty writing paragraphs", () => {
  it("accepts only empty paragraphs or whitespace-only text children", () => {
    const editor = createEditor({
      nodes: [ImageNode],
      onError: (error) => {
        throw error;
      },
    });
    editor.update(
      () => {
        const empty = $createParagraphNode();
        const whitespace = $createParagraphNode().append(
          $createTextNode(" \t "),
        );
        const text = $createParagraphNode().append($createTextNode("A story"));
        const image = $createParagraphNode().append(
          $createImageNode("/image.png", "Image"),
        );
        const mixed = $createParagraphNode().append(
          $createTextNode(" "),
          $createImageNode("/image.png", "Image"),
        );
        $getRoot().append(empty, whitespace, text, image, mixed);
        expect($isEmptyWritingParagraph(empty)).toBe(true);
        expect($isEmptyWritingParagraph(whitespace)).toBe(true);
        expect($isEmptyWritingParagraph(text)).toBe(false);
        expect($isEmptyWritingParagraph(image)).toBe(false);
        expect($isEmptyWritingParagraph(mixed)).toBe(false);
        expect($isEmptyWritingParagraph($getRoot())).toBe(false);
        expect($isEmptyWritingParagraph(null)).toBe(false);
      },
      { discrete: true },
    );
  });
});
