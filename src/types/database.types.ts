import type { Tables, TablesInsert } from "./supabase";

export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "./supabase";

export type Residential = Tables<"residentials">;
export type ResidentialUser = Tables<"residential_users">;
export type Unit = Tables<"units">;
export type UnitMember = Tables<"unit_members">;
export type Profile = Tables<"profiles">;
export type PlatformAdmin = Tables<"platform_admins">;
export type PlatformPlan = Tables<"platform_plans">;

export type InsertResidential = TablesInsert<"residentials">;
export type InsertUnit = TablesInsert<"units">;
export type InsertUnitMember = TablesInsert<"unit_members">;
export type InsertPlatformPlan = TablesInsert<"platform_plans">;

export type ResidentialRole = "owner" | "admin" | "security" | "member";
