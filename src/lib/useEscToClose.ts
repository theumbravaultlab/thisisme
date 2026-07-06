"use client";

import { useEffect } from "react";

// Close an open dialog when the user presses Escape. Standard modal behavior;
// pair with a backdrop click and a visible close control.
export function useEscToClose(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}
