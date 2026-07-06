"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ProfileSnapshot, SnapshotBody } from "@/lib/store";
import { useEscToClose } from "@/lib/useEscToClose";

interface Props {
  open: boolean;
  onClose: () => void;
  premium: boolean;
  onUpgrade: () => void;
  saveSnapshot: (label?: string) => Promise<{ error: string | null }>;
  listSnapshots: () => Promise<ProfileSnapshot[]>;
  restoreSnapshot: (body: SnapshotBody) => void;
  deleteSnapshot: (id: string) => Promise<void>;
}

function fmt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// Premium: point-in-time snapshots so you can look back (year over year) and
// restore an old version of your profile.
export function VersionHistoryModal({
  open,
  onClose,
  premium,
  onUpgrade,
  saveSnapshot,
  listSnapshots,
  restoreSnapshot,
  deleteSnapshot,
}: Props) {
  const [snaps, setSnaps] = useState<ProfileSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  useEscToClose(open, onClose);

  const refresh = useCallback(async () => {
    setLoading(true);
    setSnaps(await listSnapshots());
    setLoading(false);
  }, [listSnapshots]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && premium) refresh();
  }, [open, premium, refresh]);

  const onSave = async () => {
    setBusy(true);
    setMsg("");
    const { error } = await saveSnapshot(label);
    setBusy(false);
    if (error) {
      setMsg(error === "premium-required" ? "Premium only." : "Couldn't save — try again.");
      return;
    }
    setLabel("");
    setMsg("Version saved ✓");
    refresh();
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
            aria-label="Version history"
            className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
          >
            <div className="max-h-[80vh] overflow-y-auto rounded-3xl border border-border bg-bg-elev p-6 shadow-2xl">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="text-xl font-semibold">🕒 Version history</h2>
                <button onClick={onClose} className="text-sm text-fg-muted transition hover:text-fg">
                  Close
                </button>
              </div>

              {!premium ? (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-sm text-fg-muted">
                    Save snapshots of your profile and look back at how you&apos;ve changed —
                    year over year. Restore any past version in one tap.
                  </p>
                  <button
                    onClick={onUpgrade}
                    className="rounded-xl bg-gradient-to-r from-amber-400 to-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    ✨ Unlock with Premium — $9
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  <p className="rounded-xl border border-border bg-bg/40 px-3 py-2 text-xs text-fg-muted">
                    Your everyday edits save automatically. Version history is
                    separate — press{" "}
                    <span className="font-medium text-fg">Save</span> below to
                    capture the profile as it is right now. Only versions you save
                    here appear in your history.
                  </p>

                  <div className="flex flex-col gap-2 rounded-2xl border border-border bg-bg/40 p-3">
                    <p className="text-sm font-medium">Save this version</p>
                    <div className="flex gap-2">
                      <input
                        value={label}
                        onChange={(e) => setLabel(e.target.value)}
                        placeholder="Label (e.g. 2026) — optional"
                        className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                      <button
                        onClick={onSave}
                        disabled={busy}
                        className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                    </div>
                    {msg && <p className="text-xs text-fg-muted">{msg}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">Saved versions</p>
                    {loading ? (
                      <p className="text-sm text-fg-muted">Loading…</p>
                    ) : snaps.length === 0 ? (
                      <p className="text-sm text-fg-muted">
                        No versions yet — save one above to start your history.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {snaps.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-border bg-bg/40 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {s.label || "Version"}
                              </p>
                              <p className="text-xs text-fg-muted">{fmt(s.created_at)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {confirmRestore === s.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      restoreSnapshot(s.snapshot);
                                      onClose();
                                    }}
                                    title="Replaces your current profile with this version"
                                    className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white transition hover:opacity-90"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setConfirmRestore(null)}
                                    className="rounded-lg border border-border px-2 py-1 text-xs text-fg-muted transition hover:border-accent"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setConfirmRestore(s.id)}
                                  title="Replaces your current profile with this version"
                                  className="rounded-lg border border-accent px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
                                >
                                  Restore
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  await deleteSnapshot(s.id);
                                  refresh();
                                }}
                                aria-label="Delete version"
                                className="rounded-lg px-2 py-1 text-xs text-fg-muted transition hover:text-red-500"
                              >
                                🗑
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
