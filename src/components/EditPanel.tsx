"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  FIELD_META,
  FieldKey,
  Profile,
  ProfileData,
  CustomField,
  CustomCategory,
  customFieldCardKey,
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
  addCustomField: (categoryKey: string) => string;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  removeCustomField: (id: string) => void;
  addCustomCategory: () => string;
  updateCustomCategory: (id: string, patch: Partial<CustomCategory>) => void;
  removeCustomCategory: (id: string) => void;
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
  addCustomField,
  updateCustomField,
  removeCustomField,
  addCustomCategory,
  updateCustomCategory,
  removeCustomCategory,
  focusCategory,
  focusField,
}: Props) {
  const categories = getCategories(profile);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(categories.filter((c) => c.rows.some((r) => rowIsVisible(profile, r))).map((c) => c.key))
  );
  const [showHidden, setShowHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!focusCategory) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenCats((s) => new Set(s).add(focusCategory));
    setShowHidden((s) => new Set(s).add(focusCategory));
  }, [focusCategory]);

  useEffect(() => {
    if (!focusField) return;
    const cat = categories.find((c) =>
      c.rows.some((r) => r.kind === "builtin" && r.field === focusField)
    );
    if (!cat) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenCats((s) => new Set(s).add(cat.key));
    setShowHidden((s) => new Set(s).add(cat.key));
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

            <p className="px-4 pt-3 text-xs text-fg-muted">
              Tap a section to expand. Toggle a stat to show it on your profile.
            </p>

            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex flex-col gap-3">
                {categories.map((category) => (
                  <CategorySection
                    key={category.key}
                    category={category}
                    profile={profile}
                    premium={premium}
                    onUpgrade={onUpgrade}
                    open={openCats.has(category.key)}
                    hiddenShown={showHidden.has(category.key)}
                    expanded={expanded}
                    onToggleOpen={() => toggleCat(category.key)}
                    onRevealHidden={() =>
                      setShowHidden((s) => new Set(s).add(category.key))
                    }
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
                  <UpgradeRow
                    label="＋ Add your own category"
                    onUpgrade={onUpgrade}
                  />
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
  onUpgrade,
  open,
  hiddenShown,
  expanded,
  onToggleOpen,
  onRevealHidden,
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
  onUpgrade: () => void;
  open: boolean;
  hiddenShown: boolean;
  expanded: string | null;
  onToggleOpen: () => void;
  onRevealHidden: () => void;
  onToggleExpand: (key: string) => void;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
  toggleVisibility: (key: FieldKey) => void;
  addCustomField: (categoryKey: string) => void;
  updateCustomField: (id: string, patch: Partial<CustomField>) => void;
  removeCustomField: (id: string) => void;
  updateCustomCategory: (id: string, patch: Partial<CustomCategory>) => void;
  removeCustomCategory: (id: string) => void;
}) {
  const used = category.rows.filter((r) => rowIsVisible(profile, r));
  const hidden = category.rows.filter((r) => !rowIsVisible(profile, r));
  const visibleRows = [...used, ...(hiddenShown ? hidden : [])];
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
          <span>{open ? "▴" : "▾"}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
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
                    onToggleVis={() => toggleVisibility(row.field)}
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
                    updateCustomField={updateCustomField}
                    removeCustomField={removeCustomField}
                  />
                )
              )}

              {used.length === 0 && !hiddenShown && (
                <p className="px-1 py-1 text-xs text-fg-muted">
                  Nothing shown from this section yet.
                </p>
              )}

              {hidden.length > 0 && !hiddenShown && (
                <button
                  onClick={onRevealHidden}
                  className="mt-1 self-start text-xs font-medium text-accent transition hover:opacity-80"
                >
                  + Show {hidden.length} more
                </button>
              )}

              {/* Add detail (premium) */}
              {premium ? (
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
  data,
  update,
}: {
  field: FieldKey;
  on: boolean;
  expanded: boolean;
  premium: boolean;
  onToggleExpand: () => void;
  onToggleVis: () => void;
  data: ProfileData;
  update: <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => void;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-bg-elev transition ${on ? "" : "opacity-60"}`}>
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
  updateCustomField,
  removeCustomField,
}: {
  id: string;
  profile: Profile;
  expanded: boolean;
  onToggleExpand: () => void;
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
        <Switch on={cf.visible} onClick={() => updateCustomField(id, { visible: !cf.visible })} />
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
