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
      <header className="sticky top-0 z-40 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
        <div className="wrap flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <div className="flex items-center gap-2.5">
            <Wordmark />
            <span className="border border-line-strong px-1.5 py-0.5 text-xs font-semibold text-ink-2">Admin</span>
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
      <main id="main" className="wrap px-4 pt-8 pb-20 sm:px-6">
        {children}
      </main>
    </>
  );
}

function ShellFallback() {
  return (
    <div className="wrap px-4 pt-24 sm:px-6">
      <div className="h-40 animate-pulse bg-surface" />
    </div>
  );
}
