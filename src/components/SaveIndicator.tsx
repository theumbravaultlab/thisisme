"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { SaveStatus } from "@/lib/useProfile";

// Small transient pill confirming saves. "Saving…" stays until done; success
// messages fade after a moment.
export function SaveIndicator({
  status,
  signedIn,
}: {
  status: SaveStatus;
  signedIn: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === "idle") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(true);
    if (status === "saving") return;
    const t = setTimeout(() => setVisible(false), 1800);
    return () => clearTimeout(t);
  }, [status]);

  const text =
    status === "saving"
      ? "Saving…"
      : status === "saved"
      ? "Saved ✓"
      : signedIn
      ? "Saved offline ✓"
      : "Saved on this device ✓";

  return (
    <AnimatePresence>
      {visible && status !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="glass fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-fg"
        >
          {status === "saving" && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          )}
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
