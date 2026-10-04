import { ROUTES, getCurrentRoute } from "@/config/routes";
import { getAllowedSectionRoutes, getSection, type SectionId } from "@/config/sections";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import type { ResidentialRole } from "@/types/database.types";

/** Sibling-page tabs for a navigation section. Hidden when the role can only see one page of it. */
export function SectionTabs({ section, role }: { section: SectionId; role: ResidentialRole }) {
  const { t } = useI18n();
  const current = getCurrentRoute();
  const entries = getAllowedSectionRoutes(getSection(section), role);
  if (entries.length < 2) return null;

  return (
    <nav className="mb-4 flex flex-wrap gap-2" aria-label={t(getSection(section).labelKey)}>
      {entries.map((entry) => (
        <a
          key={entry.route}
          href={ROUTES[entry.route].hash}
          aria-current={entry.route === current ? "page" : undefined}
          className={cn(
            "flex h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors",
            entry.route === current
              ? "bg-gates-brand text-gates-text-inverse"
              : "bg-gates-surface text-gates-text-brand hover:bg-gates-subtle",
          )}
        >
          {t(entry.labelKey)}
        </a>
      ))}
    </nav>
  );
}
