import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a nullable price as currency, or a placeholder when unset. */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

/** Formats a profile's display name, falling back to email then a placeholder. */
export function formatProfileName(
  profile: { email: string | null; first_name: string | null; last_name: string | null } | null | undefined,
): string {
  if (!profile) return "—";
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  return name || profile.email || "—";
}

/** Strips accents/diacritics and lowercases, so e.g. "mexi" matches "México". */
export function normalizeForSearch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

