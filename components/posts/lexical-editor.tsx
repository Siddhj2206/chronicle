"use client";

import type { ReactNode } from "react";
import {
  useEffect,
  useCallback,
  useRef,
  useSyncExternalStore,
  useMemo,
} from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import {
  HorizontalRuleNode,
  $createHorizontalRuleNode,
  $isHorizontalRuleNode,
} from "@lexical/react/LexicalHorizontalRuleNode";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  TRANSFORMERS,
  CHECK_LIST,
  type TextMatchTransformer,
  type ElementTransformer,
} from "@lexical/markdown";
import {
  $getRoot,
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $isElementNode,
  $applyNodeReplacement,
  type EditorState,
  type LexicalNode,
} from "lexical";
import { toast } from "sonner";
import {
  DecoratorNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";

import { Skeleton } from "@/components/ui/skeleton";
import { WritingTools } from "@/components/posts/writing-tools";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_SIZE_ERROR,
  IMAGE_TYPE_ERROR,
  MAX_FILE_SIZE,
  readUploadResponse,
} from "@/lib/image-upload";

// ============================================
// Image Node
// ============================================

type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __altText: string;

  static getType(): string {
    return "image";
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    div.className = "editor-image";
    return div;
  }

  updateDOM(): false {
    return false;
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { src, altText } = serializedNode;
    return $createImageNode(src, altText);
  }

  exportJSON(): SerializedImageNode {
    return {
      type: "image",
      version: 1,
      src: this.getSrc(),
      altText: this.getAltText(),
    };
  }

  decorate(): ReactNode {
    return (
      // oxlint-disable-next-line nextjs/no-img-element
      <img
        src={this.getSrc()}
        alt={this.getAltText()}
        className="max-w-full border border-border"
        draggable={false}
        loading="lazy"
      />
    );
  }
}

export function $createImageNode(src: string, altText: string): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText || "image"));
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}

// ============================================
// Custom markdown transformer for images
// ============================================

const IMAGE_TRANSFORMER: TextMatchTransformer = {
  dependencies: [ImageNode],
  export: (node) => {
    if (!$isImageNode(node)) {
      return null;
    }
    const altText = node.getAltText() || "image";
    return `![${altText}](${node.getSrc()})`;
  },
  importRegExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))/,
  regExp: /!(?:\[([^[]*)\])(?:\(([^(]+)\))$/,
  replace: (textNode, match) => {
    const [, altText, src] = match;
    const imageNode = $createImageNode(src, altText || "image");
    textNode.replace(imageNode);
  },
  trigger: ")",
  type: "text-match",
};

// ============================================
// Horizontal Rule Transformer
// ============================================

const HR_TRANSFORMER: ElementTransformer = {
  dependencies: [HorizontalRuleNode],
  export: (node) => {
    return $isHorizontalRuleNode(node) ? "***" : null;
  },
  regExp: /^(---|\*\*\*|___)\s?$/,
  replace: (parentNode, _children, _match, isImport) => {
    const line = $createHorizontalRuleNode();
    if (isImport || parentNode.getNextSibling() != null) {
      parentNode.replace(line);
    } else {
      parentNode.insertBefore(line);
    }
    line.selectNext();
  },
  type: "element",
};

// Image transformer should come first for proper parsing
const ALL_TRANSFORMERS = [
  IMAGE_TRANSFORMER,
  HR_TRANSFORMER,
  ...TRANSFORMERS,
  CHECK_LIST,
];

// ============================================
// Image Upload Plugin
// ============================================

interface ImageUploadPluginProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function ImageUploadPlugin({ fileInputRef }: ImageUploadPluginProps) {
  const [editor] = useLexicalComposerContext();

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        return await readUploadResponse(response);
      } catch (error) {
        console.error("Image upload failed:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to upload image",
        );
        return null;
      }
    },
    [],
  );

  const insertImage = useCallback(
    (url: string, altText: string = "Image") => {
      editor.update(() => {
        const imageNode = $createImageNode(url, altText);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([imageNode]);
        } else {
          const paragraph = $createParagraphNode();
          paragraph.append(imageNode);
          $getRoot().append(paragraph);
        }
      });
    },
    [editor],
  );

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(IMAGE_TYPE_ERROR);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(IMAGE_SIZE_ERROR);
        return;
      }
      if (file.size === 0) {
        toast.error("File is empty");
        return;
      }

      const url = await uploadImage(file);
      if (url) {
        insertImage(url, file.name);
      }
    },
    [uploadImage, insertImage],
  );

  // Handle file input change
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;

    const handleChange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        await handleImageFile(file);
        target.value = ""; // Reset input
      }
    };

    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, [fileInputRef, handleImageFile]);

  // Handle paste
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file);
          }
          break;
        }
      }
    };

    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener("paste", handlePaste);
      return () => rootElement.removeEventListener("paste", handlePaste);
    }
  }, [editor, handleImageFile]);

  // Handle drag and drop
  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    const handleDrop = (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        if (file.type.startsWith("image/")) {
          event.preventDefault();
          handleImageFile(file);
          break;
        }
      }
    };

    const rootElement = editor.getRootElement();
    if (rootElement) {
      rootElement.addEventListener("dragover", handleDragOver);
      rootElement.addEventListener("drop", handleDrop);

      return () => {
        rootElement.removeEventListener("dragover", handleDragOver);
        rootElement.removeEventListener("drop", handleDrop);
      };
    }
  }, [editor, handleImageFile]);

  return null;
}

// ============================================
// Initialize Plugin
// ============================================

function InitializePlugin({ initialContent }: { initialContent?: string }) {
  const [editor] = useLexicalComposerContext();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (!initialContent) return;

    editor.update(() => {
      // Convert markdown to Lexical nodes
      $convertFromMarkdownString(initialContent, ALL_TRANSFORMERS);

      // Post-process: find any remaining image markdown in text nodes and convert them
      const root = $getRoot();
      const imageRegex = /^!\[([^\]]*)\]\(([^)]+)\)$/;

      const processNode = (node: LexicalNode) => {
        if ($isTextNode(node)) {
          const text = node.getTextContent();
          const match = text.match(imageRegex);

          if (match) {
            const [, altText, src] = match;
            const imageNode = $createImageNode(src, altText || "image");
            node.replace(imageNode);
          }
        } else if ($isElementNode(node)) {
          // Process children in reverse to avoid index issues during replacement
          const children = node.getChildren();
          children.forEach(processNode);
        }
      };

      root.getChildren().forEach(processNode);
    });
  }, [editor, initialContent]);

  return null;
}

// ============================================
// Lexical Theme
// ============================================

const theme = {
  root: "lexical-root",
  paragraph: "lexical-paragraph",
  heading: {
    h1: "lexical-h1",
    h2: "lexical-h2",
    h3: "lexical-h3",
    h4: "lexical-h4",
    h5: "lexical-h5",
    h6: "lexical-h6",
  },
  list: {
    ul: "lexical-ul",
    ol: "lexical-ol",
    listitem: "lexical-li",
    nested: {
      listitem: "lexical-nested-li",
    },
    checklist: "lexical-check-list",
    listitemChecked: "lexical-check-list-item-checked",
    listitemUnchecked: "lexical-check-list-item-unchecked",
  },
  link: "lexical-link",
  text: {
    bold: "lexical-bold",
    italic: "lexical-italic",
    strikethrough: "lexical-strikethrough",
    underline: "lexical-underline",
    code: "lexical-code",
  },
  quote: "lexical-quote",
  code: "lexical-code-block",
  horizontalRule: "lexical-hr",
};

// ============================================
// Editor Config - Hoisted to module scope for performance
// ============================================

const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  LinkNode,
  AutoLinkNode,
  CodeNode,
  CodeHighlightNode,
  HorizontalRuleNode,
  ImageNode,
];

const handleEditorError = (error: Error) => {
  console.error("Lexical error:", error);
};

// useSyncExternalStore helpers for flicker-free hydration
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// ============================================
// Main Editor Component
// ============================================

interface LexicalEditorProps {
  initialContent?: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function LexicalEditor({
  initialContent = "",
  onChange,
  placeholder = "Begin your story...",
}: LexicalEditorProps) {
  // Use useSyncExternalStore for flicker-free hydration detection
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize config to prevent recreation on every render
  const initialConfig = useMemo<InitialConfigType>(
    () => ({
      namespace: "ChronicleEditor",
      theme,
      onError: handleEditorError,
      nodes: EDITOR_NODES,
    }),
    [],
  );

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(ALL_TRANSFORMERS);
        onChange(markdown);
      });
    },
    [onChange],
  );

  const triggerImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isClient) {
    return <Skeleton className="h-[300px] w-full bg-muted" />;
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="lexical-editor-container relative">
        <WritingTools onInsertImage={triggerImageUpload} />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="lexical-content-editable !text-[20px] !leading-[1.65]"
              aria-label="Story body"
              aria-describedby="writing-help"
              aria-placeholder={placeholder}
              placeholder={
                <div className="lexical-placeholder !leading-[1.65]">
                  {placeholder}
                </div>
              }
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <HorizontalRulePlugin />
        <LinkPlugin />
        <MarkdownShortcutPlugin transformers={ALL_TRANSFORMERS} />
        <OnChangePlugin onChange={handleChange} />
        <ImageUploadPlugin fileInputRef={fileInputRef} />
        <InitializePlugin initialContent={initialContent} />
        <p id="writing-help" className="sr-only">
          Select text for formatting. Press Alt+F10 to focus formatting
          controls, or Escape to dismiss. Use the plus button on an empty
          paragraph to insert a block.
        </p>

        {/* Hidden file input for image uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </LexicalComposer>
  );
}
