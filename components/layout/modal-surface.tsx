"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ModalSurfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: React.ReactNode;
  drawer?: boolean;
  children: React.ReactNode;
  onCloseAutoFocus?: (event: Event) => void;
}

export function ModalSurface({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  drawer,
  children,
  onCloseAutoFocus,
}: ModalSurfaceProps): React.JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[110] bg-foreground/30 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className={cn(
            "fixed z-[111] overflow-y-auto border-border bg-background p-6 shadow-lg focus:outline-none",
            drawer
              ? "inset-y-0 right-0 h-dvh w-[min(90vw,24rem)] border-l pb-[max(1.5rem,env(safe-area-inset-bottom))] motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-right"
              : "left-1/2 top-1/2 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 border sm:p-8",
          )}
        >
          <Dialog.Title className="pr-10 font-serif text-4xl leading-tight">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mb-7 mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </Dialog.Description>
          {children}
          <Dialog.Close
            aria-label="Close"
            className="absolute right-4 top-4 flex size-10 items-center justify-center hover:text-primary"
          >
            <X size={20} aria-hidden="true" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
