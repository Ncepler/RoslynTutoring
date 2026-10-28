import { PageIntro } from "./page-intro";

/**
 * Wrapper for Privacy, Terms and Code of conduct. These are plain-language
 * drafts written for a student-run business. They have NOT been reviewed by
 * a lawyer; get them reviewed before taking real payments.
 */
export function LegalPage({
  title,
  lead,
  updated,
  children,
}: {
  title: string;
  lead: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageIntro title={title} lead={lead} />
      <div className="wrap grid py-12 md:py-16 lg:grid-cols-12">
        <article className="prose-doc lg:col-span-8 lg:col-start-5">
          <p className="t-label">Last updated {updated}</p>
          {children}
        </article>
      </div>
    </>
  );
}
