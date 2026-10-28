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
      <article className="prose-doc mx-auto max-w-3xl px-4 py-12 sm:px-6 md:py-16">
        <p className="t-label">Last updated {updated}</p>
        {children}
      </article>
    </>
  );
}
