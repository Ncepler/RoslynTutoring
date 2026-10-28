import Link from "next/link";

export function NotFoundBody() {
  return (
    <main id="main" className="wrap flex min-h-[60dvh] flex-col items-start justify-center py-24">
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
  );
}
