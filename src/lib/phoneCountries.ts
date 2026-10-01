/**
 * Country data for the phone input's country picker — dial codes and
 * validation come from libphonenumber-js, localized names from the
 * browser's Intl.DisplayNames (no need to ship/maintain our own list).
 */

import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

/**
 * Shown pinned at the top of the picker, in this order, before the rest
 * (alphabetical) — Honduras (home market) first, then the rest of Central
 * America, then México.
 */
export const PINNED_COUNTRIES: CountryCode[] = ["HN", "GT", "SV", "NI", "CR", "PA", "BZ", "MX"];

export const DEFAULT_COUNTRY: CountryCode = "HN";

/**
 * IANA time zone -> country, for guessing a sensible default country
 * before the person picks one. Covers Latin America (our actual market)
 * plus the handful of other regions likely to show up, and needs no
 * network call or extra dependency — just the browser's own time zone.
 * Anything not listed here just falls back to DEFAULT_COUNTRY, so
 * incomplete coverage never breaks anything, only the guess.
 */
const TIMEZONE_COUNTRY: Record<string, CountryCode> = {
  "America/Tegucigalpa": "HN",
  "America/Mexico_City": "MX",
  "America/Cancun": "MX",
  "America/Merida": "MX",
  "America/Monterrey": "MX",
  "America/Tijuana": "MX",
  "America/Chihuahua": "MX",
  "America/Hermosillo": "MX",
  "America/El_Salvador": "SV",
  "America/Guatemala": "GT",
  "America/Managua": "NI",
  "America/Costa_Rica": "CR",
  "America/Panama": "PA",
  "America/Belize": "BZ",
  "America/Bogota": "CO",
  "America/Lima": "PE",
  "America/Santiago": "CL",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Sao_Paulo": "BR",
  "America/Caracas": "VE",
  "America/La_Paz": "BO",
  "America/Asuncion": "PY",
  "America/Montevideo": "UY",
  "America/Guayaquil": "EC",
  "America/Santo_Domingo": "DO",
  "America/Havana": "CU",
  "America/Puerto_Rico": "PR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Europe/Madrid": "ES",
  "Europe/London": "GB",
};

/** Best-effort guess at the person's country from their browser's time zone. */
export function getBrowserCountry(): CountryCode {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONE_COUNTRY[timeZone] ?? DEFAULT_COUNTRY;
  } catch {
    return DEFAULT_COUNTRY;
  }
}

const countryNames = new Intl.DisplayNames(["es"], { type: "region" });

export function getCountryName(country: CountryCode): string {
  return countryNames.of(country) ?? country;
}

/** ISO 3166-1 alpha-2 -> flag emoji (regional indicator symbols). */
export function getCountryFlag(country: CountryCode): string {
  return country
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export interface CountryOption {
  code: CountryCode;
  name: string;
  flag: string;
  callingCode: string;
}

/** Every dialable country, pinned ones first, rest alphabetical by (localized) name. */
export const COUNTRY_OPTIONS: CountryOption[] = (() => {
  const all = getCountries().map((code) => ({
    code,
    name: getCountryName(code),
    flag: getCountryFlag(code),
    callingCode: getCountryCallingCode(code),
  }));

  const pinned = PINNED_COUNTRIES.map((code) => all.find((c) => c.code === code)).filter(
    (c): c is CountryOption => !!c,
  );
  const pinnedSet = new Set(PINNED_COUNTRIES);
  const rest = all.filter((c) => !pinnedSet.has(c.code)).sort((a, b) => a.name.localeCompare(b.name, "es"));

  return [...pinned, ...rest];
})();
