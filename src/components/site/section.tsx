export function SectionHeading({
  id,
  title,
  lead,
  action,
}: {
  id?: string;
  title: string;
  lead?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h2 id={id} className="t-h2">
          {title}
        </h2>
        {lead && <p className="t-lead mt-4">{lead}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({
  children,
  className = "",
  labelledBy,
  id,
  tone = "plain",
}: {
  children: React.ReactNode;
  className?: string;
  labelledBy?: string;
  id?: string;
  tone?: "plain" | "subtle";
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`${tone === "subtle" ? "bg-bg-subtle" : ""} py-16 md:py-24 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}
