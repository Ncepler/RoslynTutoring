export function PageIntro({ title, lead, children }: { title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div aria-hidden="true" className="grid-paper absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-4 pt-12 pb-12 sm:px-6 md:pt-20 md:pb-16">
        <h1 className="t-h2 enter-tf max-w-3xl md:text-[3.5rem]">{title}</h1>
        {lead && (
          <p className="t-lead enter mt-5 max-w-2xl" style={{ "--i": 1 } as React.CSSProperties}>
            {lead}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
