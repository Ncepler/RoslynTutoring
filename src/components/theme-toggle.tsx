"use client";

import { Moon, Sun } from "@/components/icons";

/**
 * Flips between light and dark and remembers the choice. Until someone uses
 * it, the site follows the device setting. Both icons are rendered and CSS
 * shows the right one, so the server and client always agree.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const current =
      root.getAttribute("data-theme") ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";

    root.classList.add("theme-transition");
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode: the choice just won't persist.
    }
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute("content", next === "dark" ? "#070b14" : "#ffffff");
    }
    window.setTimeout(() => root.classList.remove("theme-transition"), 280);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`theme-toggle grid size-10 place-items-center rounded-full text-ink-2 transition-transform duration-150 active:scale-95 ${className}`}
      aria-label="Switch between light and dark mode"
    >
      <Sun size={19} className="theme-icon-sun" />
      <Moon size={18} className="theme-icon-moon" />
    </button>
  );
}
