import Link from "next/link";
import { site } from "@/config/site";

/** Text wordmark until there's a logo. The name comes from config. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-[1.0625rem] font-[650] tracking-[-0.03em] text-ink ${className}`}
      aria-label={`${site.name} home`}
    >
      <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-accent" />
      {site.name}
    </Link>
  );
}
