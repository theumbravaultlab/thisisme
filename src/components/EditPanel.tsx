"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  FIELD_META,
  FieldKey,
  Profile,
  ProfileData,
  CustomField,
  CustomCategory,
  customFieldCardKey,
  VISIBILITY_PRESETS,
} from "@/lib/types";
import { getCategories, type CategorySpec, type Row } from "@/lib/hudCards";
import { CardBody } from "./CardBody";
import { TextInput } from "./ui";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: Profile;
  premium: boolean;
  onUpgrade: () => void;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
  toggleVisibility: (key: FieldKey) => void;
  applyPreset: (fields: FieldKey[]) => void;
  addCustomField: (categoryKey: string) => string;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  removeCustomField: (id: string) => void;
  addCustomCategory: () => string;
  updateCustomCategory: (id: string, patch: Partial<CustomCategory>) => void;
  removeCustomCategory: (id: string) => void;
  onOpenVersions: () => void;
  focusCategory: string | null;
  focusField?: FieldKey | null;
}

const rowKey = (row: Row) =>
  row.kind === "builtin" ? row.field : customFieldCardKey(row.id);

function rowIsVisible(profile: Profile, row: Row): boolean {
  return row.kind === "builtin"
    ? profile.visibility[row.field]
    : profile.data.customFields.find((f) => f.id === row.id)?.visible ?? false;
}

export function EditPanel({
  open,
  onClose,
  profile,
  premium,
  onUpgrade,
  update,
  toggleVisibility,
  applyPreset,
  addCustomField,
  updateCustomField,
  removeCustomField,
  addCustomCategory,
  updateCustomCategory,
  removeCustomCategory,
  onOpenVersions,
  focusCategory,
  focusField,
}: Props) {
  const categories = getCategories(profile);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.key))
  );

  // Does the search match anything? (drives the "no results" message)
  const q = query.trim().toLowerCase();
  const labelOfRow = (r: Row) =>
    r.kind === "builtin"
      ? FIELD_META[r.field].label
      : profile.data.customFields.find((f) => f.id === r.id)?.label ?? "";
  const anyMatch =
    !q ||
    categories.some(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.rows.some((r) => labelOfRow(r).toLowerCase().includes(q))
    );
  // Per-row "recency" of the last toggle, so a just-turned-on row sinks to the
  // bottom of the shown group and a just-turned-off row rises to the top of the
  // hidden group. Reset each time the panel closes.
  const [moves, setMoves] = useState<Record<string, number>>({});
  const moveSeq = useRef(0);

  // Closing the panel collapses every open detail + clears toggle ordering, so
  // it reopens clean.
  useEffect(() => {
    if (open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpanded(null);
    setMoves({});
    moveSeq.current = 0;
  }, [open]);

  // Flip a row's visibility, record the move for ordering, and — when turning
  // ON — open that detail for editing (turning OFF just collapses it).
  const handleToggleRow = (rowKey: string, turningOn: boolean, apply: () => void) => {
    apply();
    moveSeq.current += 1;
    setMoves((m) => ({ ...m, [rowKey]: moveSeq.current }));
    setExpanded((e) => (turningOn ? rowKey : e === rowKey ? null : e));
  };

  useEffect(() => {
    if (!focusCategory) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenCats((s) => new Set(s).add(focusCategory));
  }, [focusCategory]);

  useEffect(() => {
    if (!focusField) return;
    const cat = categories.find((c) =>
      c.rows.some((r) => r.kind === "builtin" && r.field === focusField)
    );
    if (!cat) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenCats((s) => new Set(s).add(cat.key));
    setExpanded(focusField);
    // categories is derived each render; only react to focusField changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusField]);

  const toggleCat = (key: string) =>
    setOpenCats((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const toggleExpand = (key: string) => setExpanded((e) => (e === key ? null : key));

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

            {/* Search across every stat — handy now the field list is long. */}
            <div className="border-b border-border px-4 pb-3 pt-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="🔍 Search stats…"
                aria-label="Search stats"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>

            {!query && (
              <>
                {/* One-tap presets — a fast way to set a whole vibe at once. */}
                <div className="border-b border-border px-4 pb-3 pt-3">
                  <p className="mb-2 text-xs font-medium text-fg-muted">
                    Quick start — pick a preset, then fine-tune below
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {VISIBILITY_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        onClick={() => applyPreset(preset.fields)}
                        title={preset.desc}
                        className="flex flex-col items-center gap-0.5 rounded-xl border border-border px-2 py-2 text-center text-xs transition hover:border-accent hover:bg-accent/5"
                      >
                        <span className="text-base">{preset.emoji}</span>
                        <span className="font-medium leading-tight">{preset.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="px-4 pb-3 pt-3 text-xs text-fg-muted">
                  Or toggle individual stats on and off below.
                </p>
              </>
            )}

            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-3">
                {q && !anyMatch && (
                  <p className="px-1 py-2 text-sm text-fg-muted">
                    No stats match “{query}”.
                  </p>
                )}
                {categories.map((category) => (
                  <CategorySection
                    key={category.key}
                    category={category}
                    profile={profile}
                    premium={premium}
                    query={q}
                    onUpgrade={onUpgrade}
                    open={openCats.has(category.key)}
                    expanded={expanded}
                    moves={moves}
                    onToggleRow={handleToggleRow}
                    onToggleOpen={() => toggleCat(category.key)}
                    onToggleExpand={toggleExpand}
                    update={update}
                    toggleVisibility={toggleVisibility}
                    addCustomField={(catKey) => {
                      const id = addCustomField(catKey);
                      setExpanded(customFieldCardKey(id));
                    }}
                    updateCustomField={updateCustomField}
                    removeCustomField={removeCustomField}
                    updateCustomCategory={updateCustomCategory}
                    removeCustomCategory={removeCustomCategory}
                  />
                ))}

                {!query && (
                  <>
                    {/* Add category (premium) */}
                    {premium ? (
                      <button
                        onClick={() => {
                          const id = addCustomCategory();
                          setOpenCats((s) => new Set(s).add(`cat:${id}`));
                        }}
                        className="rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                      >
                        ＋ Add your own category
                      </button>
                    ) : (
                      <UpgradeRow label="＋ Add your own category" onUpgrade={onUpgrade} />
                    )}

                    {/* Version history (premium) */}
                    <button
                      onClick={onOpenVersions}
                      className="mt-1 flex items-center justify-center gap-1.5 rounded-2xl border border-border py-3 text-sm font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                    >
                      🕒 Version history
                      {!premium && (
                        <span className="rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-500">
                          Premium
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CategorySection({
  category,
  profile,
  premium,
  query,
  onUpgrade,
  open,
  expanded,
  moves,
  onToggleRow,
  onToggleOpen,
  onToggleExpand,
  update,
  toggleVisibility,
  addCustomField,
  updateCustomField,
  removeCustomField,
  updateCustomCategory,
  removeCustomCategory,
}: {
  category: CategorySpec;
  profile: Profile;
  premium: boolean;
  query: string;
  onUpgrade: () => void;
  open: boolean;
  expanded: string | null;
  moves: Record<string, number>;
  onToggleRow: (rowKey: string, turningOn: boolean, apply: () => void) => void;
  onToggleOpen: () => void;
  onToggleExpand: (key: string) => void;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
  toggleVisibility: (key: FieldKey) => void;
  addCustomField: (categoryKey: string) => void;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  removeCustomField: (id: string) => void;
  updateCustomCategory: (id: string, patch: Partial<CustomCategory>) => void;
  removeCustomCategory: (id: string) => void;
}) {
  // When searching, keep only rows whose label (or the category title) matches,
  // and force the section open. `query` is already trimmed + lowercased.
  const searching = query.length > 0;
  const labelOf = (r: Row) =>
    r.kind === "builtin"
      ? FIELD_META[r.field].label
      : profile.data.customFields.find((f) => f.id === r.id)?.label ?? "";
  const catMatches = searching && category.title.toLowerCase().includes(query);
  const rows = searching
    ? category.rows.filter((r) => catMatches || labelOf(r).toLowerCase().includes(query))
    : category.rows;
  if (searching && rows.length === 0) return null;
  const isOpen = searching || open;
  const baseIdx = new Map(rows.map((r, i) => [rowKey(r), i]));
  const moveOf = (r: Row) => moves[rowKey(r)] ?? 0;
  const idxOf = (r: Row) => baseIdx.get(rowKey(r)) ?? 0;
  // A premium-only built-in the current (non-premium) user can't turn on yet.
  // These sink below everything else so the usable stats come first.
  const isLocked = (r: Row) =>
    r.kind === "builtin" && Boolean(FIELD_META[r.field].premium) && !premium;
  // Shown rows: most-recently-turned-on sinks to the bottom (ascending by move,
  // untouched keep original order at the top). Hidden rows: most-recently-
  // turned-off rises to the top (descending by move). Locked premium rows are
  // held out and appended last.
  const used = rows
    .filter((r) => rowIsVisible(profile, r))
    .sort((a, b) => moveOf(a) - moveOf(b) || idxOf(a) - idxOf(b));
  const hidden = rows
    .filter((r) => !rowIsVisible(profile, r) && !isLocked(r))
    .sort((a, b) => moveOf(b) - moveOf(a) || idxOf(a) - idxOf(b));
  const lockedRows = rows
    .filter((r) => !rowIsVisible(profile, r) && isLocked(r))
    .sort((a, b) => idxOf(a) - idxOf(b));
  const visibleRows = [...used, ...hidden, ...lockedRows];
  const customCatId = category.builtin ? null : category.key.slice("cat:".length);

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <button
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-1.5 font-semibold">
          <span>{category.emoji}</span>
          {category.title}
        </span>
        <span className="flex items-center gap-2 text-xs text-fg-muted">
          {used.length} shown
          <span>{isOpen ? "▴" : "▾"}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="flex flex-col gap-2 p-2.5">
              {/* rename/delete controls for custom categories */}
              {customCatId && (
                <div className="flex items-center gap-2 rounded-xl bg-bg-elev p-2">
                  <input
                    value={category.emoji}
                    onChange={(e) => updateCustomCategory(customCatId, { emoji: e.target.value })}
                    className="w-10 rounded-lg border border-border bg-bg px-2 py-1.5 text-center text-sm outline-none focus:border-accent"
                    aria-label="Category emoji"
                  />
                  <input
                    value={category.title}
                    onChange={(e) => updateCustomCategory(customCatId, { title: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent"
                    aria-label="Category name"
                  />
                  <button
                    onClick={() => removeCustomCategory(customCatId)}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-fg-muted transition hover:text-red-500"
                    aria-label="Delete category"
                  >
                    🗑
                  </button>
                </div>
              )}

              {visibleRows.map((row) =>
                row.kind === "builtin" ? (
                  <BuiltinRow
                    key={rowKey(row)}
                    field={row.field}
                    on={profile.visibility[row.field]}
                    expanded={expanded === rowKey(row)}
                    premium={premium}
                    onToggleExpand={() => onToggleExpand(rowKey(row))}
                    onToggleVis={() =>
                      onToggleRow(rowKey(row), !profile.visibility[row.field], () =>
                        toggleVisibility(row.field)
                      )
                    }
                    onUpgrade={onUpgrade}
                    data={profile.data}
                    update={update}
                  />
                ) : (
                  <CustomRow
                    key={rowKey(row)}
                    id={row.id}
                    profile={profile}
                    expanded={expanded === rowKey(row)}
                    onToggleExpand={() => onToggleExpand(rowKey(row))}
                    onToggleVis={(next) =>
                      onToggleRow(rowKey(row), next, () =>
                        updateCustomField(row.id, { visible: next })
                      )
                    }
                    updateCustomField={updateCustomField}
                    removeCustomField={removeCustomField}
                  />
                )
              )}

              {!searching && used.length === 0 && (
                <p className="px-1 py-1 text-xs text-fg-muted">
                  Nothing shown from this section yet.
                </p>
              )}

              {/* Add detail (premium) — hidden while searching */}
              {searching ? null : premium ? (
                <button
                  onClick={() => addCustomField(category.key)}
                  className="mt-1 self-start rounded-lg border border-dashed border-border px-2.5 py-1.5 text-xs font-medium text-fg-muted transition hover:border-accent hover:text-accent"
                >
                  ＋ Add a detail
                </button>
              ) : (
                <UpgradeRow label="＋ Add your own detail" onUpgrade={onUpgrade} small />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BuiltinRow({
  field,
  on,
  expanded,
  premium,
  onToggleExpand,
  onToggleVis,
  onUpgrade,
  data,
  update,
}: {
  field: FieldKey;
  on: boolean;
  expanded: boolean;
  premium: boolean;
  onToggleExpand: () => void;
  onToggleVis: () => void;
  onUpgrade: () => void;
  data: ProfileData;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
}) {
  // Some built-in fields (zodiac, pronouns) are premium — locked until upgrade.
  const locked = Boolean(FIELD_META[field].premium) && !premium;
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-bg-elev transition ${on ? "" : "opacity-60"}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
        >
          <span>{FIELD_META[field].emoji}</span>
          {FIELD_META[field].label}
          {FIELD_META[field].premium && (
            <span className="rounded-full bg-amber-400/15 px-1.5 text-[10px] font-semibold text-amber-500">
              Premium
            </span>
          )}
          <span className="text-fg-muted">{expanded ? "▴" : "▾"}</span>
        </button>
        {locked ? (
          <button
            onClick={onUpgrade}
            aria-label="Unlock with Premium"
            title="Unlock with Premium"
            className="shrink-0 rounded-full border border-amber-400/50 px-2 py-1 text-xs text-amber-500 transition hover:bg-amber-400/10"
          >
            🔒
          </button>
        ) : (
          <Switch on={on} onClick={onToggleVis} />
        )}
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
              <CardBody field={field} data={data} editing update={update} premium={premium} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomRow({
  id,
  profile,
  expanded,
  onToggleExpand,
  onToggleVis,
  updateCustomField,
  removeCustomField,
}: {
  id: string;
  profile: Profile;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleVis: (next: boolean) => void;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  removeCustomField: (id: string) => void;
}) {
  const cf = profile.data.customFields.find((f) => f.id === id);
  if (!cf) return null;

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-bg-elev transition ${cf.visible ? "" : "opacity-60"}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <button
          onClick={onToggleExpand}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
        >
          <span>{cf.emoji || "✨"}</span>
          {cf.label || "Detail"}
          <span className="text-fg-muted">{expanded ? "▴" : "▾"}</span>
        </button>
        <Switch on={cf.visible} onClick={() => onToggleVis(!cf.visible)} />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="flex flex-col gap-2 p-3">
              <div className="flex gap-2">
                <input
                  value={cf.emoji}
                  onChange={(e) => updateCustomField(id, { emoji: e.target.value })}
                  className="w-12 rounded-lg border border-border bg-bg px-2 py-2 text-center text-sm outline-none focus:border-accent"
                  aria-label="Detail emoji"
                />
                <input
                  value={cf.label}
                  onChange={(e) => updateCustomField(id, { label: e.target.value })}
                  placeholder="Label (e.g. Favorite Fruit)"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
                  aria-label="Detail label"
                />
              </div>
              <TextInput
                value={cf.value}
                onChange={(v) => updateCustomField(id, { value: v })}
                placeholder="Value (e.g. Mango)"
              />
              <button
                onClick={() => removeCustomField(id)}
                className="self-start text-xs text-fg-muted transition hover:text-red-500"
              >
                🗑 Remove detail
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UpgradeRow({
  label,
  onUpgrade,
  small,
}: {
  label: string;
  onUpgrade: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onUpgrade}
      className={`flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-accent/40 text-accent/80 transition hover:bg-accent/10 ${
        small ? "self-start px-2.5 py-1.5 text-xs" : "py-3 text-sm font-medium"
      }`}
    >
      🔒 {label} <span className="opacity-70">· Premium</span>
    </button>
  );
}

function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}
