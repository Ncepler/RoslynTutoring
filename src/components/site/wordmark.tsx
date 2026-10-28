import Link from "next/link";
import { site } from "@/config/site";

/** Text wordmark until there's a logo. The name comes from config. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`font-display inline-flex items-center gap-2 text-[1.125rem] font-[750] tracking-[-0.03em] text-ink ${className}`}
      aria-label={`${site.name} home`}
    >
      <span aria-hidden="true" className="size-3 bg-accent" />
      {site.name}
    </Link>
  );
}
