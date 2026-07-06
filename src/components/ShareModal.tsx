"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Profile } from "@/lib/types";
import { useEscToClose } from "@/lib/useEscToClose";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  cloudEnabled: boolean;
  signedIn: boolean;
  onSignIn: () => void;
  onSetHandle: () => void;
  enableSharing: () => void;
  disableSharing: () => void;
}

// Sharing mirrors your current profile exactly — whatever's visible (and
// however it's arranged) is what gets shared, with no separate per-field
// picker. Opening this dialog with a handle already set turns sharing on
// automatically, so the link is ready to copy immediately.
export function ShareModal({
  open,
  onClose,
  profile,
  cloudEnabled,
  signedIn,
  onSignIn,
  onSetHandle,
  enableSharing,
  disableSharing,
}: Props) {
  const { share, username } = profile.data;
  const [copied, setCopied] = useState(false);

  useEscToClose(open, onClose);

  const shareUrl =
    typeof window !== "undefined" && username
      ? `${window.location.origin}/p/${username}`
      : "";

  useEffect(() => {
    if (open && signedIn && username && !share.enabled) enableSharing();
  }, [open, signedIn, username, share.enabled, enableSharing]);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can still select the text */
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
            role="dialog"
            aria-modal="true"
            aria-label="Share your profile"
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-border bg-bg-elev shadow-2xl"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-lg font-semibold">🔗 Share your profile</h2>
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-1 text-sm transition hover:border-accent"
              >
                Done
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {!cloudEnabled ? (
                <p className="text-sm text-fg-muted">
                  Sharing needs the cloud backend configured (Supabase). It
                  isn&apos;t set up in this environment yet.
                </p>
              ) : !signedIn ? (
                <div className="flex flex-col gap-3 text-center">
                  <p className="text-sm text-fg-muted">
                    Sign in to create a public link for your profile.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onSignIn();
                    }}
                    className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Sign in to share
                  </button>
                </div>
              ) : !username ? (
                <div className="flex flex-col gap-3 text-center">
                  <p className="text-sm text-fg-muted">
                    Choose a handle to get your public link.
                  </p>
                  <button
                    onClick={onSetHandle}
                    className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Choose your handle
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-fg-muted">
                    Your profile shares exactly what&apos;s currently visible on
                    your page, arranged the same way — no separate setup.
                  </p>

                  {/* handle */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-bg px-3.5 py-3 text-sm">
                    <span>
                      Your handle: <span className="font-semibold">@{username}</span>
                    </span>
                    <button
                      onClick={onSetHandle}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:border-accent"
                    >
                      Change
                    </button>
                  </div>

                  {/* link */}
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm outline-none"
                    />
                    <button
                      onClick={copy}
                      className="shrink-0 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm transition hover:border-accent"
                    >
                      Open
                    </a>
                  </div>

                  {/* unpublish escape hatch */}
                  <label className="flex items-center justify-between rounded-xl border border-border bg-bg px-3.5 py-3">
                    <span className="text-sm font-medium">
                      Public profile
                      <span className="ml-1.5 text-xs text-fg-muted">
                        anyone with the link can view
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={share.enabled}
                      onChange={(e) => (e.target.checked ? enableSharing() : disableSharing())}
                      className="h-4 w-4 accent-accent"
                    />
                  </label>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
