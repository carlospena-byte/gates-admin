/**
 * Unit Wizard Types
 * Types for unit creation wizard and related entities
 */

export interface UnitType {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Location types enum
export type LocationType = string; // Changed to string to support dynamic types

// Location Type Definition (for managing available location types)
export interface LocationTypeDefinition {
  id: string;
  residential_id: string;
  name: string;
  code: string; // Uppercase code like 'TOWER', 'FLOOR', etc.
  // Hierarchy depth: 1 = top level (Edificio/Bloque), 2 = next level down
  // (Piso/Polígono), etc. A location of this type may only be parented by
  // a location whose type has level - 1 (or be a root when level is 1).
  level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Hierarchical location type
export interface Location {
  id: string;
  residential_id: string;
  name: string;
  type: string; // References LocationTypeDefinition.code
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  parent?: Location | null; // For nested parent location
  children?: Location[]; // For nested child locations
  location_types?: LocationTypeDefinition; // For nested type data
}

export interface AddonType {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Addon {
  id: string;
  residential_id: string;
  addon_type_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  addon_types?: AddonType;
  /** PostgREST embedded count aggregate: [{ count: N }] — addon_items under this addon. */
  item_count?: { count: number }[];
  /** Each addon_item with its own linked-units aggregate; sum for total units using this addon. */
  items?: { id: string; unit_addons?: { count: number }[] }[];
}

// A single physical instance of an addon (e.g. addon "Parqueo" has items
// "P1 101", "P1 102"...), each optionally placed in the location hierarchy.
export interface AddonItem {
  id: string;
  residential_id: string;
  addon_id: string;
  location_id: string | null;
  name: string;
  /** Informational reference price for this item — independent of any rental. */
  price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  addons?: Addon;
  locations?: Location | null;
}

export interface UnitAddon {
  id: string;
  unit_id: string;
  addon_item_id: string;
  created_at: string;
  addon_items?: AddonItem;
}

// Person authorized to be in a unit — contact info only, not tied to a
// registered app account (unlike unit_members).
export interface UnitResident {
  id: string;
  unit_id: string;
  residential_id: string;
  first_name: string;
  last_name: string | null;
  /** Generated from first_name/last_name — read-only. */
  full_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Resident joined with its owning unit's name, for the residential-wide
// Residents page — same join-on-select shape as VisitorWithInviter.
export type ResidentWithUnit = UnitResident & {
  units: { name: string } | null;
};

// Derived from unit_residents_with_status: whether the resident already has
// real app access (unit_members), a live/expired invitation, or neither.
export type ResidentStatus = "active" | "invited" | "expired" | "not_invited";

export type ResidentWithStatus = ResidentWithUnit & {
  status: ResidentStatus;
};

export type RentalType = "monthly" | "short_term";
export type RentalStatus = "pending" | "active" | "completed" | "cancelled";
export type RentalPaymentStatus = "pending" | "paid" | "overdue" | "cancelled" | "rejected";

// A rental period for a unit — either the ongoing 'monthly' tenancy (the
// person responsible for the unit) or a 'short_term' Airbnb-style stay.
// Tenant/guest is contact info only, like UnitResident.
export interface UnitRental {
  id: string;
  residential_id: string;
  unit_id: string;
  rental_type: RentalType;
  tenant_name: string;
  tenant_email: string | null;
  tenant_phone: string | null;
  start_date: string;
  end_date: string | null;
  price: number | null;
  status: RentalStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// One installment owed against a rental (a short_term rental typically has
// a single row; a monthly rental gets one per period).
export interface UnitRentalPayment {
  id: string;
  residential_id: string;
  rental_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: RentalPaymentStatus;
  notes: string | null;
  proof_url: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type LateFeeType = "none" | "fixed" | "percent";
export type LateFeeRecurrence = "once" | "monthly";

// A recurring monthly charge (e.g. "Seguridad", "Piscina") — separate from
// addons, which model physical, location-bound things. Charges aren't shared
// across audiences: create one per distinct price/group. Who pays is defined
// by its ChargeAssignment rules.
export interface Charge {
  id: string;
  residential_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  /** Base monthly amount; an assignment can override it. */
  amount: number;
  /** Day of month (1-28) the installments are generated. */
  generation_day: number;
  /** Day of month (1-28) each installment is due. */
  due_day: number;
  late_fee_type: LateFeeType;
  late_fee_value: number;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
  updated_at: string;
}

export type ChargeAssignmentScope = "location_subtree" | "location_only" | "unit";

// A rule saying which units a charge applies to. Resolved to concrete units
// at generation time (see resolve_charge_units).
export interface ChargeAssignment {
  id: string;
  residential_id: string;
  charge_id: string;
  scope: ChargeAssignmentScope;
  location_id: string | null;
  unit_id: string | null;
  amount_override: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  units?: { id: string; name: string } | null;
}

/** A charge applicable to one unit, with the amount that unit pays. */
export interface UnitApplicableCharge {
  charge_id: string;
  charge_name: string;
  amount: number;
  is_active: boolean;
}

// Create/Update DTOs
export interface CreateUnitTypeDto {
  residential_id: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateUnitTypeDto {
  name?: string;
  is_active?: boolean;
}

export interface CreateLocationDto {
  residential_id: string;
  name: string;
  type: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface UpdateLocationDto {
  name?: string;
  type?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

// Location Type DTOs
export interface CreateLocationTypeDto {
  residential_id: string;
  name: string;
  code: string;
  level: number;
  is_active?: boolean;
}

export interface UpdateLocationTypeDto {
  name?: string;
  code?: string;
  level?: number;
  is_active?: boolean;
}

export interface CreateAddonTypeDto {
  residential_id: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateAddonTypeDto {
  name?: string;
  is_active?: boolean;
}

export interface CreateAddonDto {
  residential_id: string;
  addon_type_id: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateAddonDto {
  addon_type_id?: string;
  name?: string;
  is_active?: boolean;
}

export interface CreateAddonItemDto {
  residential_id: string;
  addon_id: string;
  location_id?: string | null;
  name: string;
  price?: number | null;
  is_active?: boolean;
}

export interface UpdateAddonItemDto {
  location_id?: string | null;
  name?: string;
  price?: number | null;
  is_active?: boolean;
}

export interface CreateUnitResidentDto {
  unit_id: string;
  residential_id: string;
  first_name: string;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  is_active?: boolean;
}

export interface UpdateUnitResidentDto {
  first_name?: string;
  last_name?: string | null;
  email?: string;
  phone?: string | null;
  is_active?: boolean;
}

export interface CreateUnitRentalDto {
  residential_id: string;
  unit_id: string;
  rental_type: RentalType;
  tenant_name: string;
  tenant_email?: string | null;
  tenant_phone?: string | null;
  start_date: string;
  end_date?: string | null;
  price?: number | null;
  status?: RentalStatus;
  notes?: string | null;
}

export interface UpdateUnitRentalDto {
  rental_type?: RentalType;
  tenant_name?: string;
  tenant_email?: string | null;
  tenant_phone?: string | null;
  start_date?: string;
  end_date?: string | null;
  price?: number | null;
  status?: RentalStatus;
  notes?: string | null;
}

export interface CreateUnitRentalPaymentDto {
  residential_id: string;
  rental_id: string;
  amount: number;
  due_date: string;
  paid_at?: string | null;
  status?: RentalPaymentStatus;
  notes?: string | null;
}

export interface UpdateUnitRentalPaymentDto {
  amount?: number;
  due_date?: string;
  paid_at?: string | null;
  status?: RentalPaymentStatus;
  notes?: string | null;
  proof_url?: string | null;
  validated_by?: string | null;
  validated_at?: string | null;
}

export interface CreateChargeDto {
  residential_id: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  amount?: number;
  generation_day?: number;
  due_day?: number;
  late_fee_type?: LateFeeType;
  late_fee_value?: number;
  starts_on?: string;
  ends_on?: string | null;
}

export type UpdateChargeDto = Partial<Omit<CreateChargeDto, "residential_id">>;

export interface CreateChargeAssignmentDto {
  residential_id: string;
  charge_id: string;
  scope: ChargeAssignmentScope;
  location_id?: string | null;
  unit_id?: string | null;
  amount_override?: number | null;
  is_active?: boolean;
}

export interface UpdateChargeAssignmentDto {
  amount_override?: number | null;
  is_active?: boolean;
}

// Extended Unit type with wizard data
export interface UnitWithWizardData {
  id: string;
  residential_id: string;
  name: string;
  unit_type_id?: string | null;
  location_id?: string | null;
  owner_user_id?: string | null;
  price?: number | null;
  is_active: boolean;
  created_at: string;
  unit_types?: UnitType;
  locations?: Location;
  unit_addons?: UnitAddon[];
  profiles?: {
    email: string;
  };
}

// Wizard form data
export interface UnitWizardFormData {
  // Step 1: Basic Info
  name: string;
  unit_type_id: string;

  // Step 2: Location
  location_id: string;

  // Step 3: Addons
  addon_ids: string[];

  // Step 4: Owner (optional)
  owner_id?: string;

  // Status
  is_active: boolean;
}
