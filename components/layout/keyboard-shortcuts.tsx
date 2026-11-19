"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ModalSurface } from "@/components/layout/modal-surface";
import { useSession } from "@/lib/auth-client";
import { shortcutAction } from "@/lib/shortcuts";

export function ShortcutsButton(): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("chronicle:shortcuts"))}
      className="text-xs text-muted-foreground hover:text-primary"
    >
      Keyboard shortcuts
    </button>
  );
}

export function KeyboardShortcuts(): React.JSX.Element {
  const router = useRouter();
  const { data: session } = useSession();
  const [panel, setPanel] = useState<"help" | "search" | null>(null);
  const [enabled, setEnabled] = useState(true);
  const previousFocus = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchId = useId();

  useEffect(() => {
    let prefixAt = 0;
    function openHelp(): void {
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setPanel("help");
    }
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target;
      if (
        !enabled ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.isComposing ||
        event.repeat ||
        panel ||
        (target instanceof Element &&
          target.closest(
            'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="dialog"], [role="alertdialog"], [role="menu"]',
          ))
      ) {
        prefixAt = 0;
        return;
      }
      const action = shortcutAction(
        event.key,
        !!session?.user,
        prefixAt > 0 && performance.now() - prefixAt < 1000,
      );
      prefixAt = action === "prefix" ? performance.now() : 0;
      if (!action) return;
      event.preventDefault();
      if (action === "help") openHelp();
      if (action === "home") router.push("/");
      if (action === "new") router.push("/new");
      if (action === "search") {
        const input = Array.from(
          document.querySelectorAll<HTMLInputElement>("[data-global-search]"),
        ).find((element) => element.getClientRects().length > 0);
        if (input) {
          input.focus();
          input.select();
        } else {
          previousFocus.current =
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null;
          setPanel("search");
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("chronicle:shortcuts", openHelp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("chronicle:shortcuts", openHelp);
    };
  }, [enabled, panel, router, session?.user]);

  return (
    <ModalSurface
      open={panel !== null}
      onOpenChange={(open) => {
        if (!open) setPanel(null);
      }}
      title={panel === "search" ? "Search the journal" : "Keyboard shortcuts"}
      description={
        panel === "search"
          ? "Find a story, an idea or a new perspective."
          : "A few quiet ways to move around. Shortcuts pause while you type or use a menu."
      }
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        previousFocus.current?.focus();
      }}
    >
      {panel === "search" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const query = searchInput.current?.value.trim();
            if (query) {
              setPanel(null);
              router.push(`/search?q=${encodeURIComponent(query)}`);
            }
          }}
        >
          <label htmlFor={searchId} className="mb-2 block text-sm">
            Search articles
          </label>
          <input
            ref={searchInput}
            id={searchId}
            type="search"
            className="w-full border border-input bg-background px-3 py-3 text-base"
          />
          <button
            type="submit"
            className="mt-5 text-sm underline underline-offset-4"
          >
            Search
          </button>
        </form>
      ) : (
        <>
          <dl className="divide-y divide-border text-sm">
            {[
              ["/", "Focus search"],
              ["g h", "Go to the journal"],
              ...(session?.user ? [["n / c", "Write a new story"]] : []),
              ["?", "Show shortcuts"],
            ].map(([key, label]) => (
              <div
                key={key}
                className="flex items-center justify-between gap-6 py-4"
              >
                <dt>{label}</dt>
                <dd>
                  <kbd className="font-mono text-xs text-muted-foreground">
                    {key}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
          <label className="mt-6 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="size-4 accent-primary"
            />
            Enable single-key shortcuts
          </label>
        </>
      )}
    </ModalSurface>
  );
}
