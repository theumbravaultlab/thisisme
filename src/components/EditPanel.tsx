"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CATEGORIES, FIELD_META, FieldKey, Profile, ProfileData } from "@/lib/types";
import { CardBody } from "./CardBody";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
  toggleVisibility: (key: FieldKey) => void;
  focusCategory: string | null;
}

// Categories that have at least one visible field — open these by default.
function defaultOpen(visibility: Profile["visibility"]): Set<string> {
  return new Set(
    CATEGORIES.filter((c) => c.fields.some((f) => visibility[f])).map((c) => c.title)
  );
}

export function EditPanel({
  open,
  onClose,
  profile,
  update,
  toggleVisibility,
  focusCategory,
}: Props) {
  const [expanded, setExpanded] = useState<FieldKey | null>(null);
  const [openCats, setOpenCats] = useState<Set<string>>(() =>
    defaultOpen(profile.visibility)
  );
  const [showHidden, setShowHidden] = useState<Set<string>>(new Set());

  // When opened via a HUD card, jump straight to that category (revealing its
  // hidden fields too, so everything in the group is reachable at a glance).
  useEffect(() => {
    if (!focusCategory) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenCats((s) => new Set(s).add(focusCategory));
    setShowHidden((s) => new Set(s).add(focusCategory));
  }, [focusCategory]);

  const toggleCat = (title: string) =>
    setOpenCats((s) => {
      const n = new Set(s);
      if (n.has(title)) n.delete(title);
      else n.add(title);
      return n;
    });

  const revealHidden = (title: string) =>
    setShowHidden((s) => new Set(s).add(title));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-30 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.aside
            className="fixed right-0 top-0 z-40 flex h-full w-full max-w-md flex-col border-l border-border bg-bg shadow-2xl sm:w-[26rem]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg font-bold">Customize</h2>
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-1 text-sm transition hover:border-accent"
              >
                Done
              </button>
            </div>

            <p className="px-4 pt-3 text-xs text-fg-muted">
              Tap a section to expand. Toggle a stat to show it on your profile.
            </p>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-3">
                {CATEGORIES.map((category) => {
                  const used = category.fields.filter((f) => profile.visibility[f]);
                  const hidden = category.fields.filter((f) => !profile.visibility[f]);
                  const catOpen = openCats.has(category.title);
                  const hiddenShown = showHidden.has(category.title);

                  return (
                    <div
                      key={category.title}
                      className="overflow-hidden rounded-2xl border border-border"
                    >
                      {/* category header */}
                      <button
                        onClick={() => toggleCat(category.title)}
                        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
                      >
                        <span className="font-semibold">{category.title}</span>
                        <span className="flex items-center gap-2 text-xs text-fg-muted">
                          {used.length} shown
                          <span>{catOpen ? "▴" : "▾"}</span>
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {catOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-border"
                          >
                            <div className="flex flex-col gap-2 p-2.5">
                              {[...used, ...(hiddenShown ? hidden : [])].map((field) => (
                                <FieldRow
                                  key={field}
                                  field={field}
                                  on={profile.visibility[field]}
                                  expanded={expanded === field}
                                  onToggleExpand={() =>
                                    setExpanded(expanded === field ? null : field)
                                  }
                                  onToggleVis={() => toggleVisibility(field)}
                                  data={profile.data}
                                  update={update}
                                />
                              ))}

                              {used.length === 0 && !hiddenShown && (
                                <p className="px-1 py-1 text-xs text-fg-muted">
                                  Nothing shown from this section yet.
                                </p>
                              )}

                              {hidden.length > 0 && !hiddenShown && (
                                <button
                                  onClick={() => revealHidden(category.title)}
                                  className="mt-1 self-start text-xs font-medium text-accent transition hover:opacity-80"
                                >
                                  + Show {hidden.length} more
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function FieldRow({
  field,
  on,
  expanded,
  onToggleExpand,
  onToggleVis,
  data,
  update,
}: {
  field: FieldKey;
  on: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleVis: () => void;
  data: ProfileData;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-border bg-bg-elev transition ${
        on ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
        >
          <span>{FIELD_META[field].emoji}</span>
          {FIELD_META[field].label}
          <span className="text-fg-muted">{expanded ? "▴" : "▾"}</span>
        </button>
        <Switch on={on} onClick={onToggleVis} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-3">
              <CardBody field={field} data={data} editing update={update} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? "bg-accent" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}
