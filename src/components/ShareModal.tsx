"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Profile } from "@/lib/types";
import { getCategories } from "@/lib/hudCards";
import { FIELD_META } from "@/lib/types";

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
  toggleShareKey: (key: string) => void;
}

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
  toggleShareKey,
}: Props) {
  const { share, username } = profile.data;
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" && username
      ? `${window.location.origin}/p/${username}`
      : "";

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

  const publicSet = new Set(share.publicKeys);
  const categories = getCategories(profile);

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
              ) : (
                <div className="flex flex-col gap-4">
                  {/* handle */}
                  <div className="flex items-center justify-between rounded-xl border border-border bg-bg px-3.5 py-3 text-sm">
                    <span>
                      Your handle:{" "}
                      {username ? (
                        <span className="font-semibold">@{username}</span>
                      ) : (
                        <span className="text-fg-muted">not set</span>
                      )}
                    </span>
                    <button
                      onClick={onSetHandle}
                      className="rounded-lg border border-border px-2.5 py-1 text-xs transition hover:border-accent"
                    >
                      {username ? "Change" : "Set handle"}
                    </button>
                  </div>

                  {/* master toggle */}
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
                      disabled={!username}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (!username) onSetHandle();
                          else enableSharing();
                        } else {
                          disableSharing();
                        }
                      }}
                      className="h-4 w-4 accent-accent disabled:opacity-40"
                    />
                  </label>

                  {!username && (
                    <p className="-mt-2 text-xs text-fg-muted">
                      Set a handle first — it becomes your public link.
                    </p>
                  )}

                  {share.enabled && (
                    <>
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

                      {/* per-field controls */}
                      <div>
                        <p className="mb-1 text-sm font-medium">What&apos;s visible publicly</p>
                        <p className="mb-2 text-xs text-fg-muted">
                          Contact info is off by default. Toggle anything on or off.
                        </p>
                        <div className="flex flex-col gap-3">
                          {categories.map((cat) => {
                            const rows = cat.rows.filter(
                              (r) => !(r.kind === "builtin" && (r.field === "name" || r.field === "photo"))
                            );
                            if (rows.length === 0) return null;
                            return (
                              <div key={cat.key}>
                                <p className="mb-1 text-xs font-semibold text-fg-muted">
                                  {cat.emoji} {cat.title}
                                </p>
                                <div className="flex flex-col gap-1">
                                  {rows.map((r) => {
                                    const key = r.kind === "builtin" ? r.field : r.id;
                                    const label =
                                      r.kind === "builtin"
                                        ? FIELD_META[r.field].label
                                        : profile.data.customFields.find((f) => f.id === r.id)?.label ??
                                          "Detail";
                                    return (
                                      <label
                                        key={key}
                                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-bg"
                                      >
                                        {label}
                                        <input
                                          type="checkbox"
                                          checked={publicSet.has(key)}
                                          onChange={() => toggleShareKey(key)}
                                          className="h-4 w-4 accent-accent"
                                        />
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
