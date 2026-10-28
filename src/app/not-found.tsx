import { NotFoundBody } from "@/components/site/not-found-body";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/** Unmatched URLs render outside the site layout, so this adds the chrome. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <NotFoundBody />
      <SiteFooter />
    </>
  );
}
