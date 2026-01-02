export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      addon_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          residential_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          residential_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          residential_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_types_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          addon_type_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          residential_id: string
          updated_at: string
        }
        Insert: {
          addon_type_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          residential_id: string
          updated_at?: string
        }
        Update: {
          addon_type_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          residential_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "addons_addon_type_id_fkey"
            columns: ["addon_type_id"]
            isOneToOne: false
            referencedRelation: "addon_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addons_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
      amenities: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          requires_booking: boolean
          residential_id: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          requires_booking?: boolean
          residential_id: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          requires_booking?: boolean
          residential_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenities_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
      amenity_bookings: {
        Row: {
          amenity_id: string
          created_at: string
          end_time: string
          id: string
          notes: string | null
          residential_id: string
          start_time: string
          status: string
          user_id: string
        }
        Insert: {
          amenity_id: string
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          residential_id: string
          start_time: string
          status?: string
          user_id: string
        }
        Update: {
          amenity_id?: string
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          residential_id?: string
          start_time?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenity_bookings_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_bookings_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenity_bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      buildings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          residential_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          residential_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          residential_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "unit_locations"
            referencedColumns: ["building_id"]
          },
        ]
      }
      location_types: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          residential_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          residential_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          residential_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_types_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          residential_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          residential_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          residential_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
      locations_backup: {
        Row: {
          block_or_building: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          residential_id: string | null
          street_or_floor: string | null
          updated_at: string | null
        }
        Insert: {
          block_or_building?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          residential_id?: string | null
          street_or_floor?: string | null
          updated_at?: string | null
        }
        Update: {
          block_or_building?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          residential_id?: string | null
          street_or_floor?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      residential_users: {
        Row: {
          created_at: string
          residential_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          residential_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          residential_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "residential_users_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "residential_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      residentials: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          location_lat: number | null
          location_lng: number | null
          name: string
          owner_user_id: string | null
          plan_type: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_lat?: number | null
          location_lng?: number | null
          name: string
          owner_user_id?: string | null
          plan_type?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_lat?: number | null
          location_lng?: number | null
          name?: string
          owner_user_id?: string | null
          plan_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residentials_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unit_addons: {
        Row: {
          addon_id: string
          created_at: string
          id: string
          unit_id: string
        }
        Insert: {
          addon_id: string
          created_at?: string
          id?: string
          unit_id: string
        }
        Update: {
          addon_id?: string
          created_at?: string
          id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_addons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_locations"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_addons_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_members: {
        Row: {
          created_at: string
          residential_id: string
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          residential_id: string
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          residential_id?: string
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_members_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "unit_locations"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      unit_types: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          residential_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          residential_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          residential_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_types_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          building_id: string | null
          created_at: string
          floor_id: string | null
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          owner_user_id: string | null
          residential_id: string
          unit_type_id: string | null
        }
        Insert: {
          building_id?: string | null
          created_at?: string
          floor_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          owner_user_id?: string | null
          residential_id: string
          unit_type_id?: string | null
        }
        Update: {
          building_id?: string | null
          created_at?: string
          floor_id?: string | null
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          owner_user_id?: string | null
          residential_id?: string
          unit_type_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "unit_locations"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "units_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "unit_locations"
            referencedColumns: ["floor_id"]
          },
          {
            foreignKeyName: "units_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "units_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_unit_type_id_fkey"
            columns: ["unit_type_id"]
            isOneToOne: false
            referencedRelation: "unit_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      location_hierarchy: {
        Row: {
          id: string | null
          is_active: boolean | null
          level: number | null
          name: string | null
          parent_id: string | null
          path: string | null
          residential_id: string | null
          type: string | null
        }
        Relationships: []
      }
      unit_locations: {
        Row: {
          building_id: string | null
          building_name: string | null
          floor_id: string | null
          floor_name: string | null
          full_location: string | null
          residential_id: string | null
          unit_id: string | null
          unit_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_residential_id_fkey"
            columns: ["residential_id"]
            isOneToOne: false
            referencedRelation: "residentials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_platform_admin: { Args: never; Returns: boolean }
      is_residential_admin: {
        Args: { _residential_id: string }
        Returns: boolean
      }
      is_residential_owner: {
        Args: { _residential_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

