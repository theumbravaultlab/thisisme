"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  open: boolean;
  onClose: () => void;
  signInEmail: (email: string) => Promise<{ error: string | null }>;
  signInGoogle: () => Promise<{ error: string | null }>;
}

export function AuthModal({ open, onClose, signInEmail, signInGoogle }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const sendLink = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    const { error } = await signInEmail(email.trim());
    if (error) {
      setStatus("error");
      setMessage(error);
    } else {
      setStatus("sent");
    }
  };

  const google = async () => {
    const { error } = await signInGoogle();
    if (error) {
      setStatus("error");
      setMessage(
        error.toLowerCase().includes("provider")
          ? "Google isn't enabled yet — use email for now."
          : error
      );
    }
  };

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
            className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
          >
            <div className="rounded-3xl border border-border bg-bg-elev p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Save your profile</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Sign in so your profile syncs across devices.
              </p>

              {status === "sent" ? (
                <div className="mt-5 rounded-xl border border-border bg-bg-elev/50 p-4 text-sm">
                  ✅ Check <span className="font-semibold">{email}</span> for a
                  login link. You can close this window.
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-3">
                  {/* Google is the one-click path — lead with it. */}
                  <button
                    onClick={google}
                    className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Continue with Google
                  </button>

                  <div className="flex items-center gap-3 py-1 text-xs text-fg-muted">
                    <span className="h-px flex-1 bg-border" /> or{" "}
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendLink()}
                    placeholder="you@email.com"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm outline-none focus:border-accent"
                  />
                  <button
                    onClick={sendLink}
                    disabled={status === "sending"}
                    className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Email me a login link"}
                  </button>

                  {status === "error" && (
                    <p className="text-xs text-red-500">{message}</p>
                  )}
                </div>
              )}

              <button
                onClick={onClose}
                className="mt-4 w-full text-center text-xs text-fg-muted transition hover:text-fg"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
