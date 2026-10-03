import * as React from "react";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeSpinner } from "@/components/ui/time-picker";
import { useI18n } from "@/i18n/useI18n";
import { fromIso, toIso, type IsoDate } from "@/lib/date-iso";
import { cn } from "@/lib/utils";



export interface IsoDateRange {
  from: IsoDate;
  to: IsoDate;
}

interface BaseProps {
  label: string;
  placeholder?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  /** Earliest selectable date (inclusive), `yyyy-mm-dd`. */
  min?: IsoDate;
  /** Latest selectable date (inclusive), `yyyy-mm-dd`. */
  max?: IsoDate;
  /** Extra unavailable dates, rendered struck through. */
  disabledDates?: IsoDate[];
  /** Shows a "clear" action so optional values can be emptied. */
  clearable?: boolean;
  className?: string;
}

export interface SingleDatePickerProps extends BaseProps {
  mode: "single";
  value: IsoDate;
  onChange: (value: IsoDate) => void;
  /** Adds a time field; value becomes `yyyy-mm-ddThh:mm` (same as datetime-local). */
  withTime?: boolean;
}

export interface RangeDatePickerProps extends BaseProps {
  mode: "range";
  value: IsoDateRange;
  onChange: (value: IsoDateRange) => void;
  /** Lets the range be confirmed with only a start date (optional end date). */
  allowOpenEnd?: boolean;
}

export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps;

// ---------------------------------------------------------------- helpers

const datePart = (value: string) => value.slice(0, 10);
const timePart = (value: string) => (value.length > 10 ? value.slice(11, 16) : "");

function formatDate(iso: IsoDate, locale: string): string {
  const date = fromIso(iso);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatRange(range: IsoDateRange, locale: string): string {
  if (!range.from) return "";
  if (!range.to) return `${formatDate(range.from, locale)} –`;
  if (range.from === range.to) return formatDate(range.from, locale);
  return `${formatDate(range.from, locale)} – ${formatDate(range.to, locale)}`;
}

// -------------------------------------------------------------- component

export function DatePicker(props: DatePickerProps) {
  const { t, locale } = useI18n();
  const { label, placeholder, helperText, error, disabled, min, max, disabledDates, clearable, className } = props;

  const isRange = props.mode === "range";
  const committed: IsoDateRange = isRange
    ? props.value
    : { from: datePart(props.value), to: datePart(props.value) };
  const withTime = props.mode === "single" && !!props.withTime;
  const allowOpenEnd = props.mode === "range" && !!props.allowOpenEnd;

  const [open, setOpen] = React.useState(false);
  const [pendingFrom, setPendingFrom] = React.useState<IsoDate>(committed.from);
  const [pendingTo, setPendingTo] = React.useState<IsoDate>(committed.to);
  const [pendingTime, setPendingTime] = React.useState(props.mode === "single" ? timePart(props.value) : "");
  const [visibleMonth, setVisibleMonth] = React.useState(() => monthOf(committed.to || committed.from));

  const unavailable = React.useMemo(() => new Set(disabledDates ?? []), [disabledDates]);
  const isUnavailable = (iso: IsoDate) =>
    unavailable.has(iso) || (!!min && iso < datePart(min)) || (!!max && iso > datePart(max));

  const handleOpenChange = (next: boolean) => {
    if (next && disabled) return;
    setOpen(next);
    if (next) {
      setPendingFrom(committed.from);
      setPendingTo(committed.to);
      setPendingTime(props.mode === "single" ? timePart(props.value) : "");
      setVisibleMonth(monthOf(committed.to || committed.from || (min ? datePart(min) : "")));
    }
  };

  const handleDayClick = (iso: IsoDate) => {
    if (isUnavailable(iso)) return;
    if (!isRange) {
      setPendingFrom(iso);
      setPendingTo(iso);
      return;
    }
    if (!pendingFrom || pendingTo) {
      setPendingFrom(iso);
      setPendingTo("");
      return;
    }
    if (iso < pendingFrom) {
      setPendingTo(pendingFrom);
      setPendingFrom(iso);
    } else {
      setPendingTo(iso);
    }
  };

  const canConfirm = isRange ? !!pendingFrom && (!!pendingTo || allowOpenEnd) : !!pendingFrom;

  const handleConfirm = () => {
    if (!canConfirm) return;
    if (props.mode === "range") {
      props.onChange({ from: pendingFrom, to: pendingTo });
    } else {
      props.onChange(withTime ? `${pendingFrom}T${pendingTime || "00:00"}` : pendingFrom);
    }
    setOpen(false);
  };

  const handleClear = () => {
    if (props.mode === "range") props.onChange({ from: "", to: "" });
    else props.onChange("");
    setOpen(false);
  };

  const weekdayLabels = React.useMemo(() => {
    const monday = new Date(2024, 0, 1); // Monday-first, as in the design.
    return Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, monday.getDate() + i)),
    );
  }, [locale]);

  const weeks = React.useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 6 }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d)),
    );
  }, [visibleMonth]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth);
  const todayIso = toIso(new Date());

  const displayValue = isRange
    ? formatRange(committed, locale)
    : [formatDate(committed.from, locale), withTime ? timePart(props.value) : ""].filter(Boolean).join(" · ");

  const summary = isRange
    ? formatRange({ from: pendingFrom, to: pendingTo }, locale)
    : [formatDate(pendingFrom, locale), withTime && pendingFrom ? pendingTime || "00:00" : ""].filter(Boolean).join(" · ");

  const hasValue = !!committed.from;
  const triggerId = React.useId();

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            id={triggerId}
            type="button"
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            className={cn(
              "flex h-16 w-full items-center justify-between gap-3 rounded-lg border bg-gates-surface px-4 py-3 text-left ring-offset-background",
              "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring data-[state=open]:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-45 disabled:bg-muted",
              error ? "border-destructive" : "border-input",
            )}
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-medium leading-4 text-muted-foreground">{label}</span>
              <span className={cn("truncate text-base leading-6", hasValue ? "text-foreground" : "text-muted-foreground")}>
                {hasValue
                  ? displayValue
                  : (placeholder ?? t(isRange ? "datePicker.placeholder.range" : "datePicker.placeholder.single"))}
              </span>
            </span>
            <IconCalendar className="h-5 w-5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={12}
          // Never taller than the space the browser leaves: the calendar scrolls
          // while the summary + confirm button stay pinned and reachable.
          className="flex max-h-[var(--radix-popover-content-available-height)] w-[342px] flex-col rounded-3xl border-none p-4 shadow-gates-floating"
        >
          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          <div className="flex w-full items-center">
            <button
              type="button"
              aria-label={t("datePicker.prevMonth")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
              onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <p className="flex-1 text-center text-sm font-medium capitalize text-foreground">{monthLabel}</p>
            <button
              type="button"
              aria-label={t("datePicker.nextMonth")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
              onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex w-full">
            {weekdayLabels.map((w, i) => (
              <div key={i} className="flex w-11 items-center justify-center">
                <span className="text-xs font-medium text-muted-foreground">{w}</span>
              </div>
            ))}
          </div>

          <div className="mt-1 flex w-full flex-col">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex w-full">
                {week.map((day) => {
                  const iso = toIso(day);
                  const outside = day.getMonth() !== visibleMonth.getMonth();
                  const blocked = isUnavailable(iso);
                  const isStart = iso === pendingFrom;
                  const isEnd = iso === pendingTo;
                  const endpoint = isStart || isEnd;
                  const inRange = !!pendingFrom && !!pendingTo && iso > pendingFrom && iso < pendingTo;
                  const hasBand = isRange && !!pendingFrom && !!pendingTo && pendingFrom !== pendingTo;

                  return (
                    <div
                      key={iso}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center",
                        inRange && "bg-accent",
                        hasBand && isStart && "rounded-l-full bg-accent",
                        hasBand && isEnd && "rounded-r-full bg-accent",
                      )}
                    >
                      <button
                        type="button"
                        disabled={blocked}
                        aria-pressed={endpoint}
                        onClick={() => handleDayClick(iso)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-full text-sm text-foreground",
                          !endpoint && !blocked && "hover:bg-muted",
                          outside && "opacity-30",
                          blocked && "cursor-not-allowed text-muted-foreground line-through opacity-50",
                          iso === todayIso && !endpoint && "border-2 border-ring",
                          endpoint && "bg-primary text-primary-foreground",
                        )}
                      >
                        {day.getDate()}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {withTime && (
            <div className="mt-3 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">{t("datePicker.time")}</span>
              <TimeSpinner value={pendingTime || "00:00"} onChange={setPendingTime} compact />
            </div>
          )}
          </div>

          <div className="shrink-0">
          <p className="mt-3 min-h-5 text-sm font-medium text-gates-text-brand">{summary}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{t("datePicker.legend")}</p>

          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="flex h-14 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
            >
              {t(isRange ? "datePicker.confirmRange" : "datePicker.confirm")}
            </button>
            {clearable && hasValue && (
              <button
                type="button"
                onClick={handleClear}
                className="flex h-10 w-full items-center justify-center rounded-full text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                {t("datePicker.clear")}
              </button>
            )}
          </div>
          </div>
        </PopoverContent>
      </Popover>
      {(error || helperText) && (
        <p className={cn("mt-1 px-1 text-xs", error ? "text-destructive" : "text-muted-foreground")}>{error ?? helperText}</p>
      )}
    </div>
  );
}

function monthOf(iso: IsoDate): Date {
  const d = fromIso(iso) ?? new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
