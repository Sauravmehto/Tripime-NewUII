import { DetailSection } from "@/components/packages/detail/detail-section";
import { PACKAGE_ICONS, iconKeyForText } from "@/lib/packages/package-icons";

export function PackageHighlightsGrid({ highlights }: { highlights: string[] }) {
  if (highlights.length === 0) return null;
  return (
    <DetailSection
      id="package-highlights-title"
      title="Package Highlights"
      description="The experiences included in your journey."
    >
      <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        {highlights.map((highlight) => {
          const Icon = PACKAGE_ICONS[iconKeyForText(highlight)];
          return (
            <li
              key={highlight}
              className="flex min-h-12 items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-2 transition hover:border-primary-200 hover:bg-primary-50/40"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 text-[13px] font-semibold leading-snug text-ink">{highlight}</span>
            </li>
          );
        })}
      </ul>
    </DetailSection>
  );
}
