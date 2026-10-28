export function PageIntro({ title, lead, children }: { title: string; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="border-b border-line">
      <div className="wrap grid gap-6 pt-16 pb-14 md:pt-28 md:pb-20 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <h1 className="t-display enter-tf">{title}</h1>
          {lead && (
            <p className="t-lead enter mt-5 max-w-2xl" style={{ "--i": 1 } as React.CSSProperties}>
              {lead}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
