export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      asset_audit_log: {
        Row: {
          action: string
          asset_id: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string
        }
        Insert: {
          action: string
          asset_id: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          asset_id?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      asset_disposal: {
        Row: {
          asset_id: string
          buyer_info: string | null
          certificate_url: string | null
          created_at: string
          disposal_date: string
          disposal_method: string
          disposal_reason: string
          environmental_compliance: boolean | null
          id: string
          sale_value: number | null
        }
        Insert: {
          asset_id: string
          buyer_info?: string | null
          certificate_url?: string | null
          created_at?: string
          disposal_date: string
          disposal_method: string
          disposal_reason: string
          environmental_compliance?: boolean | null
          id?: string
          sale_value?: number | null
        }
        Update: {
          asset_id?: string
          buyer_info?: string | null
          certificate_url?: string | null
          created_at?: string
          disposal_date?: string
          disposal_method?: string
          disposal_reason?: string
          environmental_compliance?: boolean | null
          id?: string
          sale_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_disposal_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_maintenance: {
        Row: {
          asset_id: string
          completed_date: string | null
          cost: number | null
          created_at: string
          description: string
          id: string
          labor_hours: number | null
          maintenance_type: string
          next_maintenance_date: string | null
          parts_used: Json | null
          performed_by: string | null
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description: string
          id?: string
          labor_hours?: number | null
          maintenance_type: string
          next_maintenance_date?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          completed_date?: string | null
          cost?: number | null
          created_at?: string
          description?: string
          id?: string
          labor_hours?: number | null
          maintenance_type?: string
          next_maintenance_date?: string | null
          parts_used?: Json | null
          performed_by?: string | null
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_maintenance_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_parts: {
        Row: {
          asset_id: string
          id: string
          part_id: string
          quantity_required: number
        }
        Insert: {
          asset_id: string
          id?: string
          part_id: string
          quantity_required?: number
        }
        Update: {
          asset_id?: string
          id?: string
          part_id?: string
          quantity_required?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_parts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          code: string
          created_at: string
          created_by: string | null
          current_location: string | null
          department_id: string | null
          description: string | null
          id: string
          latitude: number | null
          location_type: string | null
          longitude: number | null
          name: string
          purchase_date: string
          purchase_value: number
          residual_value: number | null
          rfid_id: string | null
          serial_number: string | null
          status: string | null
          updated_at: string
          useful_life_years: number
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          current_location?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name: string
          purchase_date: string
          purchase_value: number
          residual_value?: number | null
          rfid_id?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          current_location?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          latitude?: number | null
          location_type?: string | null
          longitude?: number | null
          name?: string
          purchase_date?: string
          purchase_value?: number
          residual_value?: number | null
          rfid_id?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string
          useful_life_years?: number
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          budget: number | null
          created_at: string
          description: string | null
          id: string
          manager_id: string | null
          name: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          description?: string | null
          id?: string
          manager_id?: string | null
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          asset_id: string | null
          created_at: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          type: string
          uploaded_by: string | null
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          type: string
          uploaded_by?: string | null
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_parts: {
        Row: {
          cost_per_unit: number
          id: string
          maintenance_id: string
          part_id: string
          quantity_used: number
        }
        Insert: {
          cost_per_unit?: number
          id?: string
          maintenance_id: string
          part_id: string
          quantity_used?: number
        }
        Update: {
          cost_per_unit?: number
          id?: string
          maintenance_id?: string
          part_id?: string
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_parts_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "asset_maintenance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "spare_parts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parameters: Json | null
          prompt: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parameters?: Json | null
          prompt: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parameters?: Json | null
          prompt?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      spare_parts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          part_number: string
          stock_quantity: number
          supplier: string | null
          unit_cost: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          part_number: string
          stock_quantity?: number
          supplier?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          part_number?: string
          stock_quantity?: number
          supplier?: string | null
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_book_value: {
        Args: {
          purchase_date: string
          purchase_value: number
          residual_value: number
          useful_life_years: number
        }
        Returns: number
      }
      calculate_depreciation: {
        Args: {
          purchase_date: string
          purchase_value: number
          residual_value: number
          useful_life_years: number
        }
        Returns: number
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
  public: {
    Enums: {},
  },
} as const
