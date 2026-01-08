"use client";

import type { ReactNode } from "react";
import { useEffect, useCallback, useState, useRef } from "react";
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
import { LinkNode, AutoLinkNode, $isLinkNode } from "@lexical/link";
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
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  KEY_MODIFIER_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  type EditorState,
  type LexicalNode,
} from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode as ListNodeClass,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { toast } from "sonner";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import { $isCodeNode, $createCodeNode } from "@lexical/code";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { mergeRegister, $getNearestNodeOfType } from "@lexical/utils";
import {
  DecoratorNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

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
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={this.getSrc()}
        alt={this.getAltText()}
        className="max-w-full border border-border"
        draggable={false}
      />
    );
  }
}

export function $createImageNode(src: string, altText: string): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, altText || "image"));
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
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
const ALL_TRANSFORMERS = [IMAGE_TRANSFORMER, HR_TRANSFORMER, ...TRANSFORMERS, CHECK_LIST];

// ============================================
// Block type definitions
// ============================================

type BlockType =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "number"
  | "check"
  | "quote"
  | "code";

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  paragraph: "Paragraph",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  bullet: "Bullet List",
  number: "Numbered List",
  check: "Check List",
  quote: "Quote",
  code: "Code Block",
};

// ============================================
// Toolbar Icons
// ============================================

function IconBold() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z" />
    </svg>
  );
}

function IconItalic() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z" />
    </svg>
  );
}

function IconStrikethrough() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z" />
    </svg>
  );
}

function IconCode() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  );
}

function IconUndo() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
    </svg>
  );
}

function IconRedo() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
  );
}

function IconHorizontalRule() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 11h16v2H4z" />
    </svg>
  );
}

function IconClearFormatting() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.27 5L2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

// ============================================
// Toolbar Component
// ============================================

interface ToolbarProps {
  onInsertImage: () => void;
}

function ToolbarPlugin({ onInsertImage }: ToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState<BlockType>("paragraph");
  const [linkUrl, setLinkUrl] = useState("");
  const [isLinkEditOpen, setIsLinkEditOpen] = useState(false);

  // Update toolbar state based on selection
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Text format state
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsCode(selection.hasFormat("code"));

      // Link state
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        setIsLink(true);
        setLinkUrl(parent.getURL());
      } else if ($isLinkNode(node)) {
        setIsLink(true);
        setLinkUrl(node.getURL());
      } else {
        setIsLink(false);
        setLinkUrl("");
      }

      // Block type state
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

      if ($isHeadingNode(element)) {
        const tag = element.getTag();
        setBlockType(tag as BlockType);
      } else if ($isListNode(element)) {
        const parentList = $getNearestNodeOfType(anchorNode, ListNodeClass);
        const listType = parentList ? parentList.getListType() : element.getListType();
        if (listType === "check") {
          setBlockType("check");
        } else if (listType === "number") {
          setBlockType("number");
        } else {
          setBlockType("bullet");
        }
      } else if ($isQuoteNode(element)) {
        setBlockType("quote");
      } else if ($isCodeNode(element)) {
        setBlockType("code");
      } else {
        setBlockType("paragraph");
      }
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_MODIFIER_COMMAND,
        () => {
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      )
    );
  }, [editor, updateToolbar]);

  // Track undo/redo state
  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        UNDO_COMMAND,
        () => {
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        REDO_COMMAND,
        () => {
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor]);

  // Update can undo/redo - check history state
  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        // We need to access the history plugin state
        // For now, we'll use a simple approach
        setCanUndo(true); // Will be properly updated by history commands
        setCanRedo(true);
      });
    });
  }, [editor]);

  // Format handlers
  const formatBold = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
  const formatItalic = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
  const formatStrikethrough = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
  const formatCode = () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");

  const formatBlock = (type: BlockType) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === "paragraph") {
        $setBlocksType(selection, () => $createParagraphNode());
      } else if (type === "h1" || type === "h2" || type === "h3") {
        $setBlocksType(selection, () => $createHeadingNode(type));
      } else if (type === "quote") {
        $setBlocksType(selection, () => $createQuoteNode());
      } else if (type === "code") {
        $setBlocksType(selection, () => $createCodeNode());
      } else if (type === "bullet") {
        if (blockType === "bullet") {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        }
      } else if (type === "number") {
        if (blockType === "number") {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }
      } else if (type === "check") {
        if (blockType === "check") {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        } else {
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
        }
      }
    });
  };

  const insertLink = () => {
    if (isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      setIsLinkEditOpen(true);
    }
  };

  const confirmLink = () => {
    if (linkUrl) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
    }
    setIsLinkEditOpen(false);
    setLinkUrl("");
  };

  const removeLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setIsLinkEditOpen(false);
    setLinkUrl("");
  };

  const insertHorizontalRule = () => {
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.getNodes().forEach((node) => {
          if (node.getType() === "text") {
            const textNode = node;
            // @ts-expect-error - setFormat exists on TextNode
            textNode.setFormat(0);
          }
        });
      }
    });
  };

  const undo = () => editor.dispatchCommand(UNDO_COMMAND, undefined);
  const redo = () => editor.dispatchCommand(REDO_COMMAND, undefined);

  const toolbarButtonClass = (active: boolean = false) =>
    cn(
      "h-8 w-8 p-0 rounded-none",
      active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
    );

  return (
    <div className="lexical-toolbar sticky top-0 z-50 flex flex-wrap items-center gap-1 bg-background px-2 py-2">
      {/* Undo/Redo */}
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className={toolbarButtonClass()}
          title="Undo"
        >
          <IconUndo />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className={toolbarButtonClass()}
          title="Redo"
        >
          <IconRedo />
        </Button>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Block Type Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-none px-2 font-mono text-xs hover:bg-accent/50"
          >
            {BLOCK_TYPE_LABELS[blockType]}
            <IconChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-none">
          <DropdownMenuItem onClick={() => formatBlock("paragraph")}>
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock("h1")}>
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock("h2")}>
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock("h3")}>
            Heading 3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatBlock("bullet")}>
            Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock("number")}>
            Numbered List
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock("check")}>
            Check List
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatBlock("quote")}>
            Quote
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock("code")}>
            Code Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Text Formatting */}
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatBold}
          className={toolbarButtonClass(isBold)}
          title="Bold"
        >
          <IconBold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatItalic}
          className={toolbarButtonClass(isItalic)}
          title="Italic"
        >
          <IconItalic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatStrikethrough}
          className={toolbarButtonClass(isStrikethrough)}
          title="Strikethrough"
        >
          <IconStrikethrough />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={formatCode}
          className={toolbarButtonClass(isCode)}
          title="Inline Code"
        >
          <IconCode />
        </Button>

        {/* Link with Popover */}
        <Popover open={isLinkEditOpen} onOpenChange={setIsLinkEditOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={insertLink}
              className={toolbarButtonClass(isLink)}
              title="Link"
            >
              <IconLink />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 rounded-none p-3" align="start">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  URL
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmLink();
                    }
                  }}
                  className="rounded-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={confirmLink}
                  className="flex-1 rounded-none"
                  size="sm"
                >
                  {isLink ? "Update" : "Insert"}
                </Button>
                {isLink && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={removeLink}
                    className="rounded-none"
                    size="sm"
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Insert Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 rounded-none px-2 font-mono text-xs hover:bg-accent/50"
          >
            Insert
            <IconChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="rounded-none">
          <DropdownMenuItem onClick={onInsertImage}>
            <IconImage />
            <span className="ml-2">Image</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={insertHorizontalRule}>
            <IconHorizontalRule />
            <span className="ml-2">Horizontal Rule</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="mx-1 h-6 w-px bg-border" />

      {/* Clear Formatting */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={clearFormatting}
        className={toolbarButtonClass()}
        title="Clear Formatting"
      >
        <IconClearFormatting />
      </Button>

      {/* Mobile More Menu - hidden on desktop */}
      <div className="ml-auto lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={toolbarButtonClass()}
            >
              <IconMore />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-none">
            <DropdownMenuItem onClick={formatBold}>
              <IconBold />
              <span className="ml-2">Bold</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={formatItalic}>
              <IconItalic />
              <span className="ml-2">Italic</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={formatStrikethrough}>
              <IconStrikethrough />
              <span className="ml-2">Strikethrough</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={formatCode}>
              <IconCode />
              <span className="ml-2">Code</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onInsertImage}>
              <IconImage />
              <span className="ml-2">Insert Image</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={insertHorizontalRule}>
              <IconHorizontalRule />
              <span className="ml-2">Horizontal Rule</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearFormatting}>
              <IconClearFormatting />
              <span className="ml-2">Clear Formatting</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================
// Image Upload Plugin
// ============================================

interface ImageUploadPluginProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function ImageUploadPlugin({ fileInputRef }: ImageUploadPluginProps) {
  const [editor] = useLexicalComposerContext();

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Upload error:", data.error);
        throw new Error(data.error || "Upload failed");
      }

      return data.url;
    } catch (error) {
      console.error("Image upload failed:", error);
      return null;
    }
  }, []);

  const insertImage = useCallback(
    (url: string, altText: string = "Image") => {
      editor.update(() => {
        const imageNode = $createImageNode(url, altText);
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([imageNode]);
        } else {
          const root = $getRoot();
          root.append(imageNode);
        }
      });
    },
    [editor]
  );

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type. Please select an image.");
        return;
      }

      // Check file size (5MB limit)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > MAX_SIZE) {
        toast.error("Image must be smaller than 5MB");
        return;
      }

      const url = await uploadImage(file);
      if (url) {
        insertImage(url, file.name);
      } else {
        toast.error("Failed to upload image. Please try again.");
      }
    },
    [uploadImage, insertImage]
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
    if (initializedRef.current || !initialContent) return;
    initializedRef.current = true;

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
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);
  }, []);

  const initialConfig: InitialConfigType = {
    namespace: "ChronicleEditor",
    theme,
    onError: (error: Error) => {
      console.error("Lexical error:", error);
    },
    nodes: [
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
    ],
  };

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        const markdown = $convertToMarkdownString(ALL_TRANSFORMERS);
        onChange(markdown);
      });
    },
    [onChange]
  );

  const triggerImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  if (!isClient) {
    return <Skeleton className="h-[300px] w-full bg-muted" />;
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="lexical-editor-container">
        <ToolbarPlugin onInsertImage={triggerImageUpload} />
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              className="lexical-content-editable"
              aria-placeholder={placeholder}
              placeholder={
                <div className="lexical-placeholder">{placeholder}</div>
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

        {/* Hidden file input for image uploads */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden="true"
        />
      </div>
    </LexicalComposer>
  );
}
