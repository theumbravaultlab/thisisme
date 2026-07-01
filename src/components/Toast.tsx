"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

export interface ToastState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-bg-elev px-4 py-2 text-sm shadow-2xl"
        >
          <span>{toast.message}</span>
          {toast.actionLabel && (
            <button
              onClick={() => {
                toast.onAction?.();
                onDismiss();
              }}
              className="font-semibold text-accent transition hover:opacity-80"
            >
              {toast.actionLabel}
            </button>
          )}
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="text-fg-muted transition hover:text-fg"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
