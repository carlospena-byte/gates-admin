/**
 * Phone number input with a country-code picker — Figma "Input phone"
 * (node 132:853, file Bla1GPfXA7JkuZcYpVi2DS). The country segment shows
 * a flag + dial code, and opens a searchable country list (Command inside
 * a Popover, reusing the same primitives as every other combobox in this
 * app). Dial codes, validation and as-you-type formatting come from
 * libphonenumber-js; the input always displays the nationally-formatted
 * number, but the value it reports is E.164 (e.g. "+50499999999").
 */

import * as React from "react";
import { IconCheck, IconChevronDown, IconChevronUp, IconSearch } from "@tabler/icons-react";
import { AsYouType, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { Command as CommandPrimitive } from "cmdk";
import { cn, normalizeForSearch } from "@/lib/utils";
import { COUNTRY_OPTIONS, getBrowserCountry, getCountryFlag } from "@/lib/phoneCountries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandItem, CommandList } from "@/components/ui/command";

export interface PhoneInputProps {
  /** E.164 value (e.g. "+50499999999"), or "" when empty. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  /** Shown below the field while it's empty or the picker is open. */
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

// Only used to seed initial state (useState initializer), so it's fine to
// call the (synchronous, no-network) browser detection here: a value
// already on file (editing an existing resident) always wins; an empty
// field falls back to guessing the person's own country from their time
// zone, rather than hardcoding one market.
function countryFromValue(value: string): CountryCode {
  return parsePhoneNumberFromString(value || "")?.country ?? getBrowserCountry();
}

export function PhoneInput({ value, onChange, label = "Teléfono", helperText, disabled, className }: PhoneInputProps) {
  const [country, setCountry] = React.useState<CountryCode>(() => countryFromValue(value));
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const callingCode = COUNTRY_OPTIONS.find((c) => c.code === country)?.callingCode ?? "";
  // Strip the "+{callingCode}" prefix directly instead of round-tripping
  // through parsePhoneNumberFromString: that parser only recognizes a
  // number once enough digits are typed to match a real numbering plan,
  // so while typing it returns undefined for most keystrokes — and since
  // `value` always starts with "+", the naive fallback wiped the field
  // back to empty after almost every character typed.
  const nationalDigits = React.useMemo(() => {
    const prefix = `+${callingCode}`;
    if (value.startsWith(prefix)) return value.slice(prefix.length);
    if (value.startsWith("+")) return "";
    return value;
  }, [value, callingCode]);

  const formattedNational = nationalDigits ? new AsYouType(country).input(nationalDigits) : "";
  const hasValue = nationalDigits.length > 0;
  const e164Guess = hasValue ? `+${callingCode}${nationalDigits}` : "";
  const isValid = hasValue && isValidPhoneNumber(e164Guess);
  const isInvalid = hasValue && !isValid;

  const handleDigitsChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    onChange(digits ? `+${callingCode}${digits}` : "");
  };

  const handleSelectCountry = (nextCountry: CountryCode) => {
    setCountry(nextCountry);
    setPickerOpen(false);
    setSearch("");
    const nextCallingCode = COUNTRY_OPTIONS.find((c) => c.code === nextCountry)?.callingCode ?? "";
    onChange(nationalDigits ? `+${nextCallingCode}${nationalDigits}` : "");
  };

  const filteredCountries = React.useMemo(() => {
    const q = normalizeForSearch(search);
    if (!q) return COUNTRY_OPTIONS;
    return COUNTRY_OPTIONS.filter(
      (c) => normalizeForSearch(c.name).includes(q) || c.callingCode.includes(q),
    );
  }, [search]);

  const borderClass = pickerOpen
    ? "border-2 border-gates-brand"
    : isInvalid
      ? "border-2 border-gates-error"
      : isValid
        ? "border-2 border-gates-success"
        : "border border-gates-border";

  const defaultHelper = helperText ?? "";
  const helperMessage = isInvalid
    ? "Revisa el número e inténtalo de nuevo (mínimo 8 caracteres)."
    : isValid
      ? "✓ El número ingresado coincide con el formato nacional."
      : pickerOpen
        ? "Elige el prefijo del país que corresponda."
        : defaultHelper;

  const helperColorClass = isInvalid ? "text-gates-error" : isValid ? "text-gates-success" : "text-gates-text-secondary";

  return (
    <div className={cn("flex w-full flex-col items-start gap-2", className)}>
      <div
        className={cn(
          "flex h-16 w-full items-center overflow-hidden rounded-gates-md bg-gates-surface",
          borderClass,
        )}
      >
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-full shrink-0 items-center gap-2 pl-4 pr-3 disabled:cursor-not-allowed",
                pickerOpen && "bg-gates-subtle",
              )}
            >
              <span className="text-xl leading-none">{getCountryFlag(country)}</span>
              <span className="whitespace-nowrap text-sm font-medium text-gates-text-primary">+{callingCode}</span>
              {pickerOpen ? (
                <IconChevronUp className="size-3 text-gates-text-secondary" />
              ) : (
                <IconChevronDown className="size-3 text-gates-text-secondary" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 rounded-xl p-2 shadow-gates-floating" portal={false}>
            <Command shouldFilter={false} className="gap-1 bg-transparent">
              <div className="flex items-center gap-2 rounded-xl bg-gates-subtle px-3 py-2">
                <IconSearch className="size-3.5 shrink-0 text-gates-text-secondary" />
                <CommandPrimitive.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Buscar país..."
                  className="h-auto w-full flex-1 border-0 bg-transparent p-0 text-xs font-medium text-gates-text-secondary outline-none placeholder:text-gates-text-secondary"
                />
              </div>
              <CommandList className="max-h-64">
                {filteredCountries.map((c) => {
                  const selected = c.code === country;
                  return (
                    <CommandItem
                      key={c.code}
                      value={c.code}
                      onSelect={() => handleSelectCountry(c.code)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-base",
                        selected ? "bg-gates-success-bg text-gates-success" : "text-gates-text-primary",
                      )}
                    >
                      <span className="leading-none">{c.flag}</span>
                      <span className="flex-1 truncate">
                        {c.name} (+{c.callingCode})
                      </span>
                      {selected && <IconCheck className="size-3.5 shrink-0" />}
                    </CommandItem>
                  );
                })}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="h-10 w-px shrink-0 bg-gates-border" />

        <div className="flex min-w-0 flex-1 flex-col gap-1 px-4">
          <label className="text-xs font-medium leading-4 text-gates-text-secondary">{label}</label>
          <input
            type="tel"
            inputMode="tel"
            value={formattedNational}
            onChange={(e) => handleDigitsChange(e.target.value)}
            disabled={disabled}
            placeholder="9999-9999"
            className="w-full truncate border-0 bg-transparent p-0 text-base leading-6 text-gates-text-primary outline-none placeholder:text-gates-text-secondary disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {helperMessage && <p className={cn("w-full text-xs font-medium leading-4", helperColorClass)}>{helperMessage}</p>}
    </div>
  );
}
