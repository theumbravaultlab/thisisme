"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string | null;
  premium: boolean;
  onExport: () => void;
  onDeleteAccount: () => Promise<{ error: string | null }>;
  onSignOut: () => void;
}

export function AccountModal({
  open,
  onClose,
  email,
  premium,
  onExport,
  onDeleteAccount,
  onSignOut,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (deleting) return;
    setConfirming(false);
    setError(null);
    onClose();
  };

  const signOut = () => {
    onSignOut();
    close();
  };

  const doDelete = async () => {
    setDeleting(true);
    setError(null);
    const { error } = await onDeleteAccount();
    if (error) {
      setError(error);
      setDeleting(false);
      return;
    }
    // Account is gone — hard-reset to the signed-out home page.
    window.location.assign("/");
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
            onClick={close}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
          >
            <div className="rounded-3xl border border-border bg-bg-elev p-6 shadow-2xl">
              <h2 className="text-xl font-semibold">Account</h2>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                {email ? (
                  <>
                    Signed in as <span className="font-medium text-fg">{email}</span>
                  </>
                ) : (
                  "Signed in"
                )}
                {premium && (
                  <span className="rounded-full border border-amber-400/50 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                    ★ Premium
                  </span>
                )}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={onExport}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent"
                >
                  ⬇️ Export my data
                </button>

                <button
                  onClick={signOut}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent"
                >
                  Sign out
                </button>
              </div>

              {/* Danger zone */}
              <div className="mt-5 border-t border-border pt-4">
                {!confirming ? (
                  <button
                    onClick={() => setConfirming(true)}
                    className="w-full rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                  >
                    Delete account
                  </button>
                ) : (
                  <div className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/5 p-4">
                    <p className="text-sm text-fg">
                      This permanently deletes your profile, avatars, saved
                      versions, public link, and any premium — for good. This
                      can&apos;t be undone.
                    </p>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={doDelete}
                        disabled={deleting}
                        className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {deleting ? "Deleting…" : "Yes, delete everything"}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={deleting}
                        className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium transition hover:border-accent disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={close}
                disabled={deleting}
                className="mt-4 w-full text-center text-xs text-fg-muted transition hover:text-fg disabled:opacity-60"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
