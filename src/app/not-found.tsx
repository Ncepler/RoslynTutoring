import Link from "next/link";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex min-h-[60dvh] max-w-6xl flex-col items-start justify-center px-4 py-24 sm:px-6">
        <p className="t-label">404</p>
        <h1 className="t-h2 mt-3">This page doesn&apos;t exist.</h1>
        <p className="t-lead mt-4">The link might be old, or the address might have a typo.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="btn btn-primary">
            Go home
          </Link>
          <Link href="/book" className="btn btn-secondary">
            Book a session
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
