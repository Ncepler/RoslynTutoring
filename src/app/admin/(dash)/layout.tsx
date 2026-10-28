import { Suspense } from "react";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { PreviewBanner } from "@/components/site/preview-banner";
import { Wordmark } from "@/components/site/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { loadAdminData, requireAdmin } from "@/lib/data/admin";

// Everything here depends on who is signed in, so it renders per request.
export const instant = false;

export default function DashLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh bg-bg-subtle">
      <Suspense fallback={<ShellFallback />}>
        <Shell>{children}</Shell>
      </Suspense>
    </div>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const data = await loadAdminData(session);
  const openReports = data.reports.filter((r) => !r.resolvedAt).length;
  return (
    <>
      {session.preview && <PreviewBanner />}
      <header className="sticky top-0 z-40 isolate border-b border-line pt-[env(safe-area-inset-top)]">
        <div aria-hidden="true" className="glass absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Wordmark />
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-soft-ink">Admin</span>
          </div>
          <div className="order-last w-full lg:order-none lg:w-auto">
            <AdminNav openReports={openReports} />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden text-sm text-muted sm:inline">{session.tutor.firstName}</span>
            <ThemeToggle />
            <form action={signOut}>
              <button type="submit" className="btn btn-ghost btn-sm">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-6xl px-4 pt-8 pb-20 sm:px-6">
        {children}
      </main>
    </>
  );
}

function ShellFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
      <div className="h-40 animate-pulse rounded-[22px] bg-surface" />
    </div>
  );
}
