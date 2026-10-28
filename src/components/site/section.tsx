/**
 * A section is a hairline, a short title on the left, and the content on
 * the right. Generous space around it does the separating; there are no
 * alternating backgrounds. Stacks on phones.
 */
export function Section({
  id,
  title,
  lead,
  action,
  children,
}: {
  id?: string;
  title: string;
  lead?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId}>
      <div className="wrap py-16 md:py-24">
        <div className="grid gap-10 border-t border-line pt-8 lg:grid-cols-12 lg:gap-8">
          <header className="lg:col-span-4">
            <h2 id={headingId} className="t-h2">
              {title}
            </h2>
            {lead && <p className="mt-4 max-w-xs text-ink-2">{lead}</p>}
            {action && <div className="mt-6">{action}</div>}
          </header>
          <div className="min-w-0 lg:col-span-8">{children}</div>
        </div>
      </div>
    </section>
  );
}
