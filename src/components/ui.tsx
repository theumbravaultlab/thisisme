"use client";

import { useState } from "react";

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
    />
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const selectClass =
  "w-full appearance-none rounded-lg border border-border bg-bg px-2.5 py-2 text-sm text-fg outline-none focus:border-accent";

// Day / Month / Year selects rather than a single native date input — on
// mobile, a <select> already opens as a spinning wheel (iOS) or a picker
// dialog (Android), which is the best "wheel" UX without a custom widget.
export function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [yStr, mStr, dStr] = value ? value.split("-") : ["", "", ""];
  const year = yStr ? Number(yStr) : undefined;
  const month = mStr ? Number(mStr) : undefined;
  const day = dStr ? Number(dStr) : undefined;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 101 }, (_, i) => thisYear - i);
  const maxDay = daysInMonth(year ?? thisYear, month ?? 12);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const commit = (nextDay?: number, nextMonth?: number, nextYear?: number) => {
    if (!nextDay || !nextMonth || !nextYear) return;
    const clampedDay = Math.min(nextDay, daysInMonth(nextYear, nextMonth));
    const pad = (n: number) => String(n).padStart(2, "0");
    onChange(`${nextYear}-${pad(nextMonth)}-${pad(clampedDay)}`);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="relative">
        <select
          value={day ?? ""}
          onChange={(e) => commit(Number(e.target.value), month, year)}
          className={selectClass}
          aria-label="Day"
        >
          <option value="" disabled>
            Day
          </option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <select
          value={month ?? ""}
          onChange={(e) => commit(day, Number(e.target.value), year)}
          className={selectClass}
          aria-label="Month"
        >
          <option value="" disabled>
            Month
          </option>
          {MONTHS.map((label, i) => (
            <option key={label} value={i + 1}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="relative">
        <select
          value={year ?? ""}
          onChange={(e) => commit(day, month, Number(e.target.value))}
          className={selectClass}
          aria-label="Year"
        >
          <option value="" disabled>
            Year
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Editable list of short strings (achievements, movies, songs).
const LIST_MAX = 3;

export function ListEditor({
  items,
  onChange,
  placeholder,
  max = LIST_MAX,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");
  const atMax = items.length >= max;

  const add = () => {
    const v = draft.trim();
    if (!v || atMax) return;
    onChange([...items, v]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-2 rounded-lg bg-bg px-3 py-1.5 text-sm"
          >
            <span className="min-w-0 flex-1 whitespace-normal break-words">{item}</span>
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="shrink-0 text-fg-muted transition hover:text-accent"
              aria-label="Remove"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {atMax ? (
        <p className="text-xs text-fg-muted">Up to {max} — remove one to add another.</p>
      ) : (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder={placeholder}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={add}
            className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}

// Dropdown with a built-in "Custom…" escape hatch for free text.
export function Select({
  value,
  onChange,
  options,
  allowCustom = true,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allowCustom?: boolean;
}) {
  const known = options.includes(value);
  const isCustom = allowCustom && value !== "" && !known;
  const [custom, setCustom] = useState(isCustom);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <select
          value={custom ? "__custom__" : value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              setCustom(true);
            } else {
              setCustom(false);
              onChange(v);
            }
          }}
          className="w-full appearance-none rounded-lg border border-border bg-bg px-3 py-2 pr-8 text-sm text-fg outline-none focus:border-accent"
        >
          <option value="" disabled>
            Select…
          </option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {allowCustom && <option value="__custom__">Custom…</option>}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-fg-muted">
          ▾
        </span>
      </div>
      {custom && (
        <TextInput value={value} onChange={onChange} placeholder="Type your own" />
      )}
    </div>
  );
}

// Range slider with a live value label.
export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-muted">Drag to set</span>
        <span className="font-semibold text-accent">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
      />
    </div>
  );
}

// Read-only chip list for view mode.
export function ChipList({ items }: { items: string[] }) {
  if (items.length === 0)
    return <p className="text-sm text-fg-muted">Nothing here yet</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="rounded-full bg-accent/12 px-2.5 py-1 text-sm text-fg"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
