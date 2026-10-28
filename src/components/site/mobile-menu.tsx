"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Close, Menu } from "@/components/icons";
import { NAV } from "./nav";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="grid size-10 place-items-center rounded-full text-ink transition-transform duration-150 active:scale-95"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <Close size={20} /> : <Menu size={20} />}
      </button>
      <div
        className="menu-scrim fixed inset-0 top-[calc(var(--header-h)+env(safe-area-inset-top))] z-30 bg-[var(--scrim)]"
        data-open={open}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <nav
        id={panelId}
        aria-label="Main"
        data-open={open}
        className="menu-panel card absolute right-3 left-3 top-[calc(var(--header-h)+env(safe-area-inset-top)+4px)] z-40 p-2"
      >
        <ul>
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-[14px] px-4 text-[1.0625rem] font-medium tracking-[-0.01em] text-ink active:bg-bg-subtle"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
