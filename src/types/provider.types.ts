import type { ProviderKind } from "@/types/visitor.types";

export type { ProviderKind };

// Reusable providers catalog (delivery companies, vendors, couriers).
// `residential_id: null` is a global, platform-managed entry every
// residential sees; a non-null value is that one residential's own extra,
// scoped exactly like the `services` catalog.
export interface Provider {
  id: string;
  residential_id: string | null;
  name: string;
  kind: ProviderKind;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InsertProvider {
  // Omit (or pass null) to create a global entry — platform admin only,
  // enforced by RLS. Residential-scoped managers always pass their own id.
  residential_id?: string | null;
  name: string;
  kind: ProviderKind;
  logo_url?: string | null;
  is_active?: boolean;
}

export interface UpdateProvider {
  name?: string;
  kind?: ProviderKind;
  logo_url?: string | null;
  is_active?: boolean;
}
