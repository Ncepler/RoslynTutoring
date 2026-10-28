import { Plus } from "@/components/icons";
import type { Faq } from "@/content/faq";

export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="border-t border-line">
      {items.map((f) => (
        <details key={f.q} className="border-b border-line">
          <summary className="flex min-h-16 items-center justify-between gap-6 py-4 text-[1.0625rem] font-semibold">
            {f.q}
            <Plus size={20} className="disclosure-icon shrink-0 text-muted" />
          </summary>
          <p className="max-w-2xl pb-6 text-ink-2">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
