"use client";

import { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $setSelection,
  $createParagraphNode,
  $createTextNode,
  FORMAT_TEXT_COMMAND,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createCodeNode } from "@lexical/code";
import { $createLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";

import { editorUrl } from "@/lib/draft";
import { $isEmptyWritingParagraph } from "@/lib/writing-selection";

import type { RangeSelection } from "lexical";

export function WritingTools({
  onInsertImage,
}: {
  onInsertImage: () => void;
}): React.JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    kind: "format" | "insert";
  } | null>(null);
  const [menu, setMenu] = useState(false);
  const [urlMode, setUrlMode] = useState<"link" | "embed" | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    code: false,
  });
  const tools = useRef<HTMLDivElement>(null);
  const selection = useRef<RangeSelection | null>(null);
  const dismissed = useRef("");
  const signature = useRef("");

  useEffect(() => {
    let frame = 0;
    function update(): void {
      frame = 0;
      if (tools.current?.contains(document.activeElement)) return;
      const root = editor.getRootElement();
      const dom = window.getSelection();
      if (
        !root ||
        !dom?.anchorNode ||
        !root.contains(dom.anchorNode) ||
        document.activeElement !== root
      ) {
        setPosition(null);
        setMenu(false);
        setUrlMode(null);
        return;
      }
      editor.getEditorState().read(() => {
        const range = $getSelection();
        if (!$isRangeSelection(range)) {
          setPosition(null);
          return;
        }
        selection.current = range.clone();
        signature.current = `${range.anchor.key}:${range.anchor.offset}:${range.focus.key}:${range.focus.offset}`;
        if (dismissed.current === signature.current) return;
        if (!range.isCollapsed() && dom.rangeCount) {
          const bounds = dom.getRangeAt(0).getBoundingClientRect();
          setFormats({
            bold: range.hasFormat("bold"),
            italic: range.hasFormat("italic"),
            code: range.hasFormat("code"),
          });
          setPosition({
            kind: "format",
            top: Math.max(72, bounds.top - 52),
            left: Math.max(
              12,
              Math.min(
                window.innerWidth - 296,
                bounds.left + bounds.width / 2 - 142,
              ),
            ),
          });
          setMenu(false);
        } else {
          const node = range.anchor.getNode();
          const block = node.getTopLevelElement();
          if ($isEmptyWritingParagraph(block)) {
            const bounds = editor
              .getElementByKey(block.getKey())
              ?.getBoundingClientRect();
            if (bounds)
              setPosition({
                kind: "insert",
                top: bounds.top,
                left: Math.max(2, bounds.left - 34),
              });
          } else {
            setPosition(null);
            setMenu(false);
          }
        }
      });
    }
    function schedule(): void {
      if (!frame) frame = requestAnimationFrame(update);
    }
    function keyboard(event: KeyboardEvent): void {
      if (event.altKey && event.key === "F10") {
        event.preventDefault();
        tools.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
      if (event.key === "Escape") {
        dismissed.current = signature.current;
        setPosition(null);
        setMenu(false);
        setUrlMode(null);
      }
    }
    const removeUpdate = editor.registerUpdateListener(schedule);
    const root = editor.getRootElement();
    root?.addEventListener("keydown", keyboard);
    document.addEventListener("selectionchange", schedule);
    document.addEventListener("focusin", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      removeUpdate();
      cancelAnimationFrame(frame);
      root?.removeEventListener("keydown", keyboard);
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("focusin", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
    };
  }, [editor]);

  function run(action: () => void): void {
    editor.update(() => {
      if (selection.current) $setSelection(selection.current.clone());
      action();
    });
  }
  function close(): void {
    dismissed.current = signature.current;
    setPosition(null);
    setMenu(false);
    setUrlMode(null);
    editor.focus();
  }
  function submitUrl(event: React.FormEvent): void {
    event.preventDefault();
    const value = editorUrl(url);
    if (!value) {
      setError("Enter a complete http or https URL.");
      return;
    }
    run(() => {
      if (urlMode === "link")
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, value);
      else {
        const range = $getSelection();
        if (!$isRangeSelection(range)) return;
        const block = range.anchor.getNode().getTopLevelElement();
        const paragraph = $createParagraphNode().append(
          $createLinkNode(value).append($createTextNode(value)),
        );
        if (block && $isEmptyWritingParagraph(block)) block.replace(paragraph);
        else if (block) block.insertAfter(paragraph);
        else range.insertNodes([paragraph]);
        const next = $createParagraphNode();
        paragraph.insertAfter(next);
        next.select();
      }
    });
    setUrlMode(null);
    setMenu(false);
    setUrl("");
    setError("");
  }

  if (!position) return null;
  const button =
    "flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary aria-pressed:bg-muted";
  return (
    <div
      ref={tools}
      className="fixed z-30 max-w-[calc(100vw-16px)]"
      style={{ top: position.top, left: position.left }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
        if (
          ["ArrowLeft", "ArrowRight"].includes(event.key) &&
          event.target instanceof HTMLButtonElement
        ) {
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button",
            ),
          ];
          const index = buttons.indexOf(event.target);
          buttons[
            (index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) %
              buttons.length
          ]?.focus();
          event.preventDefault();
        }
      }}
    >
      {position.kind === "format" ? (
        <div
          role="toolbar"
          aria-label="Text formatting"
          className="flex w-fit items-center border border-border bg-background p-1 shadow-sm"
          onMouseDown={(event) => {
            if (event.target instanceof HTMLButtonElement)
              event.preventDefault();
          }}
        >
          <button
            type="button"
            className={button}
            aria-label="Bold"
            aria-pressed={formats.bold}
            onClick={() =>
              run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"))
            }
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            className={button}
            aria-label="Italic"
            aria-pressed={formats.italic}
            onClick={() =>
              run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"))
            }
          >
            <em>I</em>
          </button>
          <button
            type="button"
            className={button}
            aria-label="Link"
            onClick={() => {
              setUrlMode("link");
              setUrl("");
              setError("");
            }}
          >
            ↗
          </button>
          <button
            type="button"
            className={button}
            aria-label="Heading 2"
            onClick={() =>
              run(() => {
                const range = $getSelection();
                if ($isRangeSelection(range))
                  $setBlocksType(range, () => $createHeadingNode("h2"));
              })
            }
          >
            H2
          </button>
          <button
            type="button"
            className={button}
            aria-label="Heading 3"
            onClick={() =>
              run(() => {
                const range = $getSelection();
                if ($isRangeSelection(range))
                  $setBlocksType(range, () => $createHeadingNode("h3"));
              })
            }
          >
            H3
          </button>
          <button
            type="button"
            className={button}
            aria-label="Quote"
            onClick={() =>
              run(() => {
                const range = $getSelection();
                if ($isRangeSelection(range))
                  $setBlocksType(range, () => $createQuoteNode());
              })
            }
          >
            “
          </button>
          <button
            type="button"
            className={button}
            aria-label="Inline code"
            aria-pressed={formats.code}
            onClick={() =>
              run(() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"))
            }
          >
            {"<>"}
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <button
            type="button"
            className={`${button} border border-border bg-background text-muted-foreground`}
            aria-label="Insert block"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            +
          </button>
          {menu && (
            <div
              role="group"
              aria-label="Insert block options"
              className="min-w-36 border border-border bg-background p-2 shadow-sm"
            >
              <button
                type="button"
                className={button}
                onClick={() => {
                  run(() => {});
                  onInsertImage();
                  setMenu(false);
                }}
              >
                Image
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  run(() => {
                    const range = $getSelection();
                    if ($isRangeSelection(range))
                      $setBlocksType(range, () => $createCodeNode());
                  });
                  setMenu(false);
                }}
              >
                Code block
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  run(() =>
                    editor.dispatchCommand(
                      INSERT_HORIZONTAL_RULE_COMMAND,
                      undefined,
                    ),
                  );
                  setMenu(false);
                }}
              >
                Divider
              </button>
              <button
                type="button"
                className={button}
                onClick={() => {
                  setUrlMode("embed");
                  setUrl("");
                  setError("");
                }}
              >
                Embed URL
              </button>
            </div>
          )}
        </div>
      )}
      {urlMode && (
        <form
          onSubmit={submitUrl}
          className="mt-2 w-64 space-y-2 border border-border bg-background p-3 shadow-sm"
        >
          <label className="block text-xs">
            {urlMode === "link" ? "Link URL" : "Embed URL"}
            <input
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              className="mt-2 w-full border border-border bg-background p-2 text-sm"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-3 text-xs">
            <button type="submit">Insert</button>
            {urlMode === "link" && (
              <button
                type="button"
                onClick={() => {
                  run(() => editor.dispatchCommand(TOGGLE_LINK_COMMAND, null));
                  setUrlMode(null);
                }}
              >
                Remove link
              </button>
            )}
            <button type="button" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
