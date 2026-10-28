"use client";

import { useId } from "react";

type Option<T extends string | number> = { value: T; label: React.ReactNode; hint?: React.ReactNode };

/**
 * Apple-style segmented control built on native radios, so keyboard and
 * screen readers work for free. The thumb slides with a transform.
 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  size = "md",
}: {
  label: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  size?: "md" | "lg";
}) {
  const name = useId();
  const index = options.findIndex((o) => o.value === value);
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="relative grid border border-line-strong bg-surface p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 bg-ink transition-[transform,opacity] duration-[260ms] ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${Math.max(index, 0) * 100}%)`,
          opacity: index === -1 ? 0 : 1,
        }}
      />
      {options.map((o) => (
        <label
          key={String(o.value)}
          className={`relative z-10 flex cursor-pointer flex-col items-center justify-center px-3 text-center transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
 size === "lg" ? "min-h-14 py-2" : "min-h-10 py-1.5"
          } ${o.value === value ? "text-bg" : "text-ink-2"}`}
        >
          <input
            type="radio"
            name={name}
            className="sr-only"
            checked={o.value === value}
            onChange={() => onChange(o.value)}
          />
          <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{o.label}</span>
          {o.hint && <span className={`text-xs ${o.value === value ? "text-bg/75" : "text-muted"}`}>{o.hint}</span>}
        </label>
      ))}
    </div>
  );
}
