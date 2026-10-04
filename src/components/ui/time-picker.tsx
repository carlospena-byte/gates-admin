import * as React from "react";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function SpinnerColumn({
  items,
  selected,
  onSelect,
  label,
  compact,
}: {
  compact?: boolean;
  items: string[];
  selected: string;
  onSelect: (item: string) => void;
  label: string;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  // Center the selected row whenever the column mounts or the value changes.
  React.useEffect(() => {
    const row = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    const list = listRef.current;
    if (row && list) list.scrollTop = row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2;
  }, [selected]);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      className={cn(
        "relative flex-1 overflow-y-auto rounded-2xl bg-gates-subtle [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        // compact shows 3 rows (selected + one neighbour each side) so it fits inside the DatePicker.
        compact ? "h-28 py-9" : "h-44 py-[4.25rem]",
      )}
    >
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <button
            key={item}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(item)}
            className={cn(
              "mx-auto flex h-9 w-14 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
              isSelected ? "bg-primary font-semibold text-primary-foreground" : "text-foreground hover:bg-gates-accent",
            )}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

/** Hour + minute spinner columns (24h, `HH:mm`). Used inline by TimePicker and DatePicker's `withTime`. */
export function TimeSpinner({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [hour = "00", minute = "00"] = /^\d{2}:\d{2}$/.test(value) ? value.split(":") : [];
  return (
    <div className="flex items-center gap-2">
      <SpinnerColumn compact={compact} items={HOURS} selected={hour} label={t("timePicker.hours")} onSelect={(h) => onChange(`${h}:${minute}`)} />
      <span className="text-lg font-semibold text-muted-foreground">:</span>
      <SpinnerColumn compact={compact} items={MINUTES} selected={minute} label={t("timePicker.minutes")} onSelect={(m) => onChange(`${hour}:${m}`)} />
    </div>
  );
}

export interface TimePickerProps {
  label: string;
  /** `HH:mm` (24h), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type Meridiem = "AM" | "PM";

/** `HH:mm` (24h) -> the 4 digits + AM/PM shown in the 12h entry. */
function toEntry(value: string): { digits: string; meridiem: Meridiem } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { digits: "0900", meridiem: "AM" };
  const h24 = Number(match[1]);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { digits: `${String(h12).padStart(2, "0")}${match[2]}`, meridiem: h24 >= 12 ? "PM" : "AM" };
}

/** 4 digits ("0930") + AM/PM -> `HH:mm` (24h), or null when not a real 12h time. */
function fromEntry(digits: string, meridiem: Meridiem): string | null {
  const padded = digits.padStart(4, "0");
  const hour = Number(padded.slice(0, 2));
  const minute = Number(padded.slice(2));
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const h24 = (hour % 12) + (meridiem === "PM" ? 12 : 0);
  return `${String(h24).padStart(2, "0")}:${padded.slice(2)}`;
}

/**
 * Time field you type straight into, ATM-style: digits fill from the right and
 * push earlier ones left (9, 3, 0 reads 00:09, 00:93, 09:30), with an AM/PM
 * switch inside the field. Calls `onChange` (24h `HH:mm`) whenever the typed
 * time is a real 12h time; an incomplete entry reverts on blur.
 */
export function TimePicker({ label, value, onChange, disabled, className }: TimePickerProps) {
  const { t } = useI18n();
  const initial = value ? toEntry(value) : { digits: "", meridiem: "AM" as Meridiem };
  const [digits, setDigits] = React.useState(initial.digits);
  const [meridiem, setMeridiem] = React.useState<Meridiem>(initial.meridiem);

  const result = fromEntry(digits, meridiem);
  const hasEntry = digits.length > 0;
  const invalid = hasEntry && !result && digits.length >= 3;

  // Follow outside changes (e.g. the form resetting) without fighting the user's typing.
  React.useEffect(() => {
    if (value === (result ?? "") || (!value && !hasEntry)) return;
    if (value) {
      const entry = toEntry(value);
      setDigits(entry.digits);
      setMeridiem(entry.meridiem);
    } else {
      setDigits("");
    }
    // Only react to the incoming value; `result` changes come from typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (nextDigits: string, nextMeridiem: Meridiem) => {
    setDigits(nextDigits);
    setMeridiem(nextMeridiem);
    const next = fromEntry(nextDigits, nextMeridiem);
    if (next) onChange(next);
  };

  const padded = digits.padStart(4, "0");
  const display = hasEntry ? `${padded.slice(0, 2)}:${padded.slice(2)}` : "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      commit((digits + e.key).slice(-4), meridiem);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      commit(digits.slice(0, -1), meridiem);
    } else if (e.key === "Delete") {
      e.preventDefault();
      commit("", meridiem);
    } else if (e.key.toLowerCase() === "a") {
      e.preventDefault();
      commit(digits, "AM");
    } else if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      commit(digits, "PM");
    }
  };

  // Fallback for input that skips keydown (paste, mobile keyboards).
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    commit(e.target.value.replace(/\D/g, "").slice(-4), meridiem);
  };

  const handleBlur = () => {
    if (result) return;
    // Incomplete entry: fall back to the last committed value.
    if (value) {
      const entry = toEntry(value);
      setDigits(entry.digits);
      setMeridiem(entry.meridiem);
    } else {
      setDigits("");
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex h-16 w-full items-center justify-between gap-3 rounded-lg border border-input bg-gates-surface px-4 py-3 ring-offset-background",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          invalid && "border-destructive focus-within:border-destructive focus-within:ring-destructive",
          disabled && "cursor-not-allowed bg-muted opacity-45",
        )}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium leading-4 text-muted-foreground">{label}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            disabled={disabled}
            value={display}
            placeholder="00:00"
            title={invalid ? t("timePicker.invalid") : undefined}
            onKeyDown={handleKeyDown}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={(e) => e.target.select()}
            className={cn(
              "w-full border-0 bg-transparent p-0 text-base leading-6 tabular-nums outline-none placeholder:text-muted-foreground",
              invalid ? "text-destructive" : "text-foreground",
            )}
          />
        </label>
        <div className="flex shrink-0 gap-1" role="radiogroup" aria-label="AM/PM">
          {(["AM", "PM"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={meridiem === m}
              disabled={disabled}
              onClick={() => commit(digits, m)}
              className={cn(
                "h-8 rounded-full px-2.5 text-xs font-medium transition-colors",
                meridiem === m ? "bg-primary text-primary-foreground" : "bg-gates-subtle text-foreground hover:bg-gates-accent",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
