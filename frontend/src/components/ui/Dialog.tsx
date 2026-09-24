"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  title?: string;
  description?: string;
}

export function DialogContent({ className, children, title, description, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-md bg-surface border border-border rounded-card shadow-2xl",
          "focus-visible:outline-none",
          "animate-fade-up",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          {title && <DialogPrimitive.Title className="text-md font-semibold text-primary">{title}</DialogPrimitive.Title>}
          {description && <DialogPrimitive.Description className="sr-only">{description}</DialogPrimitive.Description>}
          <DialogPrimitive.Close
            className="ml-auto text-muted hover:text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-0.5"
            aria-label="Close"
          >
            <X size={16} />
          </DialogPrimitive.Close>
        </div>
        <div className="p-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

// Side Panel / Drawer
interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: string;
  children: React.ReactNode;
}

export function SidePanel({ open, onClose, title, width = "560px", children }: SidePanelProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-bg/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 bg-surface border-l border-border overflow-y-auto flex flex-col"
            style={{ width }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-surface z-10">
              {title && <h2 className="text-md font-semibold text-primary">{title}</h2>}
              <button
                onClick={onClose}
                className="ml-auto text-muted hover:text-secondary transition-colors duration-fast focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded p-0.5"
                aria-label="Close panel"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// Right Drawer (for repo connect flow)
export function Drawer({ open, onClose, title, children }: SidePanelProps) {
  return <SidePanel open={open} onClose={onClose} title={title} width="420px">{children}</SidePanel>;
}
