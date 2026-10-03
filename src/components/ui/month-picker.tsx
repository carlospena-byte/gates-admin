import * as React from "react";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";

/** Month value as `yyyy-mm` (same shape as `<input type="month">`), or "" when empty. */
export type IsoMonth = string;

export interface MonthPickerProps {
  label: string;
  value: IsoMonth;
  onChange: (value: IsoMonth) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Shows a "clear" action so optional values can be emptied. */
  clearable?: boolean;
  className?: string;
}

const parse = (value: IsoMonth) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  return match ? { year: Number(match[1]), month: Number(match[2]) - 1 } : null;
};

/** Month/year picker in the DatePicker's visual language (trigger + floating card). */
export function MonthPicker({ label, value, onChange, placeholder, disabled, clearable, className }: MonthPickerProps) {
  const { t, locale } = useI18n();
  const selected = parse(value);
  const [open, setOpen] = React.useState(false);
  const [year, setYear] = React.useState(() => selected?.year ?? new Date().getFullYear());

  const now = new Date();
  const monthNames = React.useMemo(
    () => Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2024, m, 1))),
    [locale],
  );
  const rawDisplay = selected
    ? new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(selected.year, selected.month, 1))
    : "";
  const display = rawDisplay.charAt(0).toUpperCase() + rawDisplay.slice(1); // "octubre de 2026" → "Octubre de 2026"

  const handleOpenChange = (next: boolean) => {
    if (next && disabled) return;
    setOpen(next);
    if (next) setYear(selected?.year ?? new Date().getFullYear());
  };

  const pick = (month: number) => {
    onChange(`${year}-${String(month + 1).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "flex h-16 w-full items-center justify-between gap-3 rounded-lg border border-input bg-gates-surface px-4 py-3 text-left ring-offset-background",
              "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-muted",
            )}
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium leading-4 text-muted-foreground">{label}</span>
              <span className={cn("truncate text-base leading-6", display ? "text-foreground" : "text-muted-foreground")}>
                {display || (placeholder ?? t("datePicker.placeholder.month"))}
              </span>
            </span>
            <IconCalendar className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[300px] rounded-3xl border-none p-4 shadow-gates-floating">
          <div className="flex w-full items-center">
            <button
              type="button"
              aria-label={t("datePicker.prevYear")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
              onClick={() => setYear((y) => y - 1)}
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <p className="flex-1 text-center text-sm font-medium text-foreground">{year}</p>
            <button
              type="button"
              aria-label={t("datePicker.nextYear")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
              onClick={() => setYear((y) => y + 1)}
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1">
            {monthNames.map((name, month) => {
              const isSelected = selected?.year === year && selected.month === month;
              const isCurrent = now.getFullYear() === year && now.getMonth() === month;
              return (
                <button
                  key={month}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => pick(month)}
                  className={cn(
                    "flex h-11 items-center justify-center rounded-full text-sm capitalize text-foreground",
                    !isSelected && "hover:bg-muted",
                    isCurrent && !isSelected && "border-2 border-ring",
                    isSelected && "bg-primary text-primary-foreground",
                  )}
                >
                  {name.replace(".", "")}
                </button>
              );
            })}
          </div>

          {clearable && value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mt-3 flex h-10 w-full items-center justify-center rounded-full text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              {t("datePicker.clear")}
            </button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
