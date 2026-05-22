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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      courier_ledger: {
        Row: {
          amount_cop: number
          courier_id: string
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Insert: {
          amount_cop: number
          courier_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          type: Database["public"]["Enums"]["ledger_type"]
        }
        Update: {
          amount_cop?: number
          courier_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          type?: Database["public"]["Enums"]["ledger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "courier_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          balance_owed_cop: number
          created_at: string
          current_lat: number | null
          current_lng: number | null
          document_id: string | null
          document_url: string | null
          is_online: boolean
          last_seen: string | null
          license_plate: string
          status: Database["public"]["Enums"]["courier_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_owed_cop?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          document_id?: string | null
          document_url?: string | null
          is_online?: boolean
          last_seen?: string | null
          license_plate: string
          status?: Database["public"]["Enums"]["courier_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_owed_cop?: number
          created_at?: string
          current_lat?: number | null
          current_lng?: number | null
          document_id?: string | null
          document_url?: string | null
          is_online?: boolean
          last_seen?: string | null
          license_plate?: string
          status?: Database["public"]["Enums"]["courier_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          order_id: string
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          order_id: string
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          city: string
          courier_earnings_cop: number
          courier_id: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          description: string | null
          distance_km: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          fare_cop: number
          id: string
          payment_confirmed: boolean
          payment_method: Database["public"]["Enums"]["payment_method"]
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee_cop: number
          recipient_name: string | null
          recipient_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          city?: string
          courier_earnings_cop: number
          courier_id?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          description?: string | null
          distance_km?: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          fare_cop: number
          id?: string
          payment_confirmed?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"]
          picked_up_at?: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee_cop: number
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          city?: string
          courier_earnings_cop?: number
          courier_id?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          description?: string | null
          distance_km?: number
          dropoff_address?: string
          dropoff_lat?: number
          dropoff_lng?: number
          fare_cop?: number
          id?: string
          payment_confirmed?: boolean
          payment_method?: Database["public"]["Enums"]["payment_method"]
          picked_up_at?: string | null
          pickup_address?: string
          pickup_lat?: number
          pickup_lng?: number
          platform_fee_cop?: number
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_order: {
        Args: { _order_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          city: string
          courier_earnings_cop: number
          courier_id: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          description: string | null
          distance_km: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          fare_cop: number
          id: string
          payment_confirmed: boolean
          payment_method: Database["public"]["Enums"]["payment_method"]
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee_cop: number
          recipient_name: string | null
          recipient_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_order: {
        Args: { _order_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          city: string
          courier_earnings_cop: number
          courier_id: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          description: string | null
          distance_km: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          fare_cop: number
          id: string
          payment_confirmed: boolean
          payment_method: Database["public"]["Enums"]["payment_method"]
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee_cop: number
          recipient_name: string | null
          recipient_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_picked_up: {
        Args: { _order_id: string }
        Returns: {
          accepted_at: string | null
          cancelled_at: string | null
          city: string
          courier_earnings_cop: number
          courier_id: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          description: string | null
          distance_km: number
          dropoff_address: string
          dropoff_lat: number
          dropoff_lng: number
          fare_cop: number
          id: string
          payment_confirmed: boolean
          payment_method: Database["public"]["Enums"]["payment_method"]
          picked_up_at: string | null
          pickup_address: string
          pickup_lat: number
          pickup_lng: number
          platform_fee_cop: number
          recipient_name: string | null
          recipient_phone: string | null
          status: Database["public"]["Enums"]["order_status"]
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      settle_courier_balance: {
        Args: { _amount: number; _courier_id: string; _notes?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "customer" | "courier" | "admin"
      courier_status: "pending_approval" | "approved" | "suspended"
      ledger_type: "cash_collected" | "platform_fee_owed" | "payout"
      order_status:
        | "pending"
        | "accepted"
        | "picked_up"
        | "delivered"
        | "cancelled"
      payment_method: "cash" | "nequi"
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
    Enums: {
      app_role: ["customer", "courier", "admin"],
      courier_status: ["pending_approval", "approved", "suspended"],
      ledger_type: ["cash_collected", "platform_fee_owed", "payout"],
      order_status: [
        "pending",
        "accepted",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cash", "nequi"],
    },
  },
} as const
