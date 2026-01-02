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

// New hierarchical location types
export interface Building {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Floor {
  id: string;
  building_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  buildings?: Building;
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
}

export interface UnitAddon {
  id: string;
  unit_id: string;
  addon_id: string;
  created_at: string;
  addons?: Addon;
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
  is_active?: boolean;
}

export interface UpdateLocationTypeDto {
  name?: string;
  code?: string;
  is_active?: boolean;
}

// Building DTOs
export interface CreateBuildingDto {
  residential_id: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateBuildingDto {
  name?: string;
  is_active?: boolean;
}

// Floor DTOs
export interface CreateFloorDto {
  building_id: string;
  name: string;
  is_active?: boolean;
}

export interface UpdateFloorDto {
  name?: string;
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

// Extended Unit type with wizard data
export interface UnitWithWizardData {
  id: string;
  residential_id: string;
  name: string;
  unit_type_id?: string | null;
  location_id?: string | null;
  owner_user_id?: string | null;
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
