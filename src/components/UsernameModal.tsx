"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useEscToClose } from "@/lib/useEscToClose";

const RE = /^[a-z0-9_]{3,20}$/;

interface Props {
  open: boolean;
  onClose: () => void;
  currentUsername: string;
  checkUsername: (name: string) => Promise<boolean>;
  claimUsername: (name: string) => Promise<string | null>;
}

type Status = "idle" | "invalid" | "checking" | "available" | "taken";

export function UsernameModal({
  open,
  onClose,
  currentUsername,
  checkUsername,
  claimUsername,
}: Props) {
  const [name, setName] = useState(currentUsername);
  const [status, setStatus] = useState<Status>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscToClose(open, onClose);

  // Changing an existing handle breaks the old public link — warn before saving.
  const changingHandle =
    !!currentUsername && name.toLowerCase().trim() !== currentUsername;

  useEffect(() => {
    const u = name.toLowerCase().trim();
    if (!RE.test(u)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus(u ? "invalid" : "idle");
      return;
    }
    if (u === currentUsername) {
      setStatus("available");
      return;
    }
    setStatus("checking");
    const t = setTimeout(async () => {
      const ok = await checkUsername(u);
      setStatus(ok ? "available" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [name, currentUsername, checkUsername]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const err = await claimUsername(name);
    setSaving(false);
    if (err) setError(err);
    else onClose();
  };

  const hint =
    status === "invalid"
      ? "3–20 characters: lowercase letters, numbers, underscore."
      : status === "checking"
      ? "Checking availability…"
      : status === "taken"
      ? "That handle is taken."
      : status === "available" && name
      ? "✓ Available"
      : "";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Choose your handle"
            className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-bg-elev p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
          >
            <h2 className="text-xl font-semibold">Choose your handle</h2>
            <p className="mt-1 text-sm text-fg-muted">
              This is your public link and your identity on thisisme.
            </p>

            <div className="mt-4 flex items-center gap-1 rounded-xl border border-border bg-bg px-3 py-2.5 focus-within:border-accent">
              <span className="text-sm text-fg-muted">/p/</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase())}
                onKeyDown={(e) => e.key === "Enter" && status === "available" && save()}
                placeholder="yourname"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>

            {hint && (
              <p
                className={`mt-2 text-xs ${
                  status === "available" ? "text-green-500" : "text-fg-muted"
                }`}
              >
                {hint}
              </p>
            )}
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}

            {changingHandle && status === "available" && (
              <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400">
                ⚠ Heads up: your current link{" "}
                <span className="font-medium">/p/{currentUsername}</span> will stop
                working. Anyone who saved or posted it won&apos;t find your profile
                anymore.
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm transition hover:border-accent"
              >
                Later
              </button>
              <button
                onClick={save}
                disabled={status !== "available" || saving}
                className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : currentUsername ? "Update handle" : "Claim handle"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
