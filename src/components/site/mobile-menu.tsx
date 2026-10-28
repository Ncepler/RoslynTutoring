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
        className="grid size-10 place-items-center text-ink"
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
        className="menu-panel absolute inset-x-0 top-full z-40 border-b border-line bg-bg px-4 pb-3"
      >
        <ul>
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="font-display flex min-h-14 items-center border-b border-line text-[1.25rem] font-[650] tracking-[-0.02em] text-ink last:border-b-0 active:text-accent-text"
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
