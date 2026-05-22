type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-ledger">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-normal text-ink md:text-4xl">
        {title}
      </h1>
      {description ? (
        <p className="mt-3 text-base leading-7 text-ink/65">{description}</p>
      ) : null}
    </div>
  );
}
