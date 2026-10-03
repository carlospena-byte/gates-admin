/** Filter controls (visit type, invited by, document state) shared by the bottom sheet and the side panel. */

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import { countActiveFilters, EMPTY_FILTERS, type DocFilter, type SecurityFilters, type VisitTypeFilter } from "./securityVisits";

function Chips<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-11 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            value === o.value
              ? "border-gates-brand bg-gates-brand text-gates-text-inverse"
              : "border-gates-border bg-gates-surface text-gates-text-primary hover:bg-gates-accent",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface VisitFiltersProps {
  value: SecurityFilters;
  resultCount: number;
  onChange: (next: SecurityFilters) => void;
  onDone: () => void;
}

export function VisitFilters({ value, resultCount, onChange, onDone }: VisitFiltersProps) {
  const { t } = useI18n();
  const typeOptions: { value: VisitTypeFilter; label: string }[] = [
    { value: "all", label: t("visitors.filters.typeAll") },
    { value: "visit", label: t("visitors.type.visit") },
    { value: "frequent", label: t("visitors.type.frequent") },
    { value: "delivery", label: t("visitors.type.delivery") },
    { value: "fastlane", label: t("visitors.type.fastlane") },
  ];
  const docOptions: { value: DocFilter; label: string }[] = [
    { value: "all", label: t("security.visits.filters.doc.all") },
    { value: "ready", label: t("security.visits.filters.doc.ready") },
    { value: "missing", label: t("security.visits.filters.doc.missing") },
  ];

  return (
    <div className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gates-text-primary">{t("security.visits.filters.type")}</legend>
        <Chips value={value.type} options={typeOptions} label={t("security.visits.filters.type")} onChange={(type) => onChange({ ...value, type })} />
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="security-invited-by" className="text-sm font-semibold text-gates-text-primary">
          {t("security.visits.filters.invitedBy")}
        </label>
        <input
          id="security-invited-by"
          value={value.invitedBy}
          onChange={(e) => onChange({ ...value, invitedBy: e.target.value })}
          placeholder={t("security.visits.filters.invitedByPlaceholder")}
          className="h-12 w-full rounded-lg border border-input bg-gates-surface px-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gates-text-primary">{t("security.visits.filters.document")}</legend>
        <Chips value={value.doc} options={docOptions} label={t("security.visits.filters.document")} onChange={(doc) => onChange({ ...value, doc })} />
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="sm:flex-1" disabled={countActiveFilters(value) === 0} onClick={() => onChange(EMPTY_FILTERS)}>
          {t("security.visits.filters.clear")}
        </Button>
        <Button className="sm:flex-1" onClick={onDone}>
          {t("security.visits.filters.show", { count: resultCount })}
        </Button>
      </div>
    </div>
  );
}
