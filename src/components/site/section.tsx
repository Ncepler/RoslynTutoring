/**
 * Swiss section: a full-width rule, the heading in the left four columns,
 * the content in the right eight. Stacks on phones.
 */
export function Section({
  id,
  title,
  lead,
  action,
  children,
  tone = "plain",
}: {
  id?: string;
  title: string;
  lead?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  tone?: "plain" | "subtle";
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={tone === "subtle" ? "bg-bg-subtle" : ""}>
      <div className="wrap py-16 md:py-24">
        <div className="rule-top grid gap-8 pt-6 lg:grid-cols-12 lg:gap-8">
          <header className="lg:col-span-4">
            <h2 id={headingId} className="t-h2">
              {title}
            </h2>
            {lead && <p className="mt-4 max-w-sm text-ink-2">{lead}</p>}
            {action && <div className="mt-6">{action}</div>}
          </header>
          <div className="min-w-0 lg:col-span-8">{children}</div>
        </div>
      </div>
    </section>
  );
}
