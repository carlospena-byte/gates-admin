import * as React from "react";
import { IconCalendar, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  label: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  applyLabel: string;
  locale: string;
  className?: string;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatRange(range: DateRange, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  return `${formatter.format(range.from)} – ${formatter.format(range.to)}`;
}

/**
 * Range field + calendar panel, matching the "Date picker / IFTA" Figma
 * component (node 32:280) — Range mode only, since that's the only variant
 * this app currently needs (visitors history filter).
 */
export function DateRangePicker({ label, value, onChange, applyLabel, locale, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [pendingFrom, setPendingFrom] = React.useState<Date | null>(value.from);
  const [pendingTo, setPendingTo] = React.useState<Date | null>(value.to);
  const [visibleMonth, setVisibleMonth] = React.useState(() => new Date(value.to.getFullYear(), value.to.getMonth(), 1));

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setPendingFrom(value.from);
      setPendingTo(value.to);
      setVisibleMonth(new Date(value.to.getFullYear(), value.to.getMonth(), 1));
    }
  };

  const handleDayClick = (day: Date) => {
    if (!pendingFrom || (pendingFrom && pendingTo)) {
      setPendingFrom(day);
      setPendingTo(null);
      return;
    }
    if (day < pendingFrom) {
      setPendingTo(pendingFrom);
      setPendingFrom(day);
    } else {
      setPendingTo(day);
    }
  };

  const handleApply = () => {
    if (pendingFrom && pendingTo) {
      onChange({ from: pendingFrom, to: pendingTo });
    }
    setOpen(false);
  };

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth);
  const weekdayLabels = React.useMemo(() => {
    // Monday-first, matching the design.
    const base = new Date(2024, 0, 1); // a Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d);
    });
  }, [locale]);

  const weeks = React.useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    // getDay(): 0=Sun..6=Sat -> convert to Monday-first offset.
    const leadingOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(gridStart.getDate() - leadingOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }

    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [visibleMonth]);

  const today = startOfDay(new Date());

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-16 w-full flex-col justify-center gap-0.5 rounded-2xl border border-input bg-gates-surface px-4 py-2 text-left ring-offset-background focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className,
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex flex-col gap-0.5">
              <span className="text-xs font-medium leading-none text-muted-foreground">{label}</span>
              <span className="text-sm leading-tight text-foreground">{formatRange(value, locale)}</span>
            </span>
            <IconCalendar className="h-5 w-5 shrink-0 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[342px] rounded-3xl border-none p-4 shadow-gates-floating">
        <div className="flex w-full items-center">
          <button
            type="button"
            aria-label="Previous month"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
            onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          >
            <IconChevronLeft className="h-5 w-5" />
          </button>
          <p className="flex-1 text-center text-sm font-medium capitalize text-foreground">{monthLabel}</p>
          <button
            type="button"
            aria-label="Next month"
            className="flex h-11 w-11 items-center justify-center rounded-full text-foreground hover:bg-muted"
            onClick={() => setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 flex w-full">
          {weekdayLabels.map((w, i) => (
            <div key={i} className="flex w-11 flex-col items-center justify-center">
              <span className="text-xs font-medium text-muted-foreground">{w}</span>
            </div>
          ))}
        </div>

        <div className="mt-1 flex w-full flex-col">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex w-full">
              {week.map((day) => {
                const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();
                const isToday = isSameDay(day, today);
                const isRangeStart = pendingFrom ? isSameDay(day, pendingFrom) : false;
                const isRangeEnd = pendingTo ? isSameDay(day, pendingTo) : false;
                const isInRange = pendingFrom && pendingTo ? day > pendingFrom && day < pendingTo : false;
                const isEndpoint = isRangeStart || isRangeEnd;

                return (
                  <button
                    type="button"
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center text-sm text-foreground",
                      isOutsideMonth && "opacity-30",
                      isInRange && "bg-accent",
                      isEndpoint && "rounded-full bg-primary text-primary-foreground",
                      isToday && !isEndpoint && "rounded-full border-2 border-ring",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <p className="mt-3 text-sm font-medium text-gates-text-brand">
          {pendingFrom && pendingTo ? formatRange({ from: pendingFrom, to: pendingTo }, locale) : " "}
        </p>

        <button
          type="button"
          disabled={!pendingFrom || !pendingTo}
          onClick={handleApply}
          className="mt-3 flex h-14 w-full items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
        >
          {applyLabel}
        </button>
      </PopoverContent>
    </Popover>
  );
}
