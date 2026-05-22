type MetricBlockProps = {
  label: string;
  value: string;
  change: string;
};

export function MetricBlock({ label, value, change }: MetricBlockProps) {
  return (
    <div className="border-l border-line px-5 first:border-l-0 max-sm:border-l-0 max-sm:border-t max-sm:px-0 max-sm:py-4 max-sm:first:border-t-0">
      <p className="text-sm text-ink/55">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase text-ledger">{change}</p>
    </div>
  );
}
