import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";

type WorkListProps = {
  title: string;
  items: string[];
  icon?: LucideIcon;
};

export function WorkList({ title, items, icon: Icon = CheckCircle2 }: WorkListProps) {
  return (
    <section className="rounded-lg border border-line bg-white/70 p-6 shadow-soft">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-ledger text-white">
          <Icon size={19} aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-ink/70">
            <CheckCircle2
              className="mt-1 shrink-0 text-ledger"
              size={16}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
