import { PreviewBanner } from "@/components/site/preview-banner";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { isPreview } from "@/lib/env";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus: focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
      >
        Skip to content
      </a>
      {isPreview && <PreviewBanner />}
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
