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
      booker_profiles: {
        Row: {
          company_or_event_type: string | null
          created_at: string
          full_name: string
          id: string
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_or_event_type?: string | null
          created_at?: string
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_or_event_type?: string | null
          created_at?: string
          full_name?: string
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_requests: {
        Row: {
          access_token: string
          amount_paid: number
          balance_amount: number | null
          balance_requested_at: string | null
          booking_currency: string
          client_email: string
          client_name: string
          client_phone: string | null
          client_user_id: string | null
          completed_at: string | null
          created_at: string
          deposit_amount: number | null
          deposit_type: Database["public"]["Enums"]["deposit_type"]
          deposit_value: number
          dj_id: string
          event_date: string | null
          event_type: string
          gig_state: Database["public"]["Enums"]["booking_gig_state"]
          id: string
          message: string | null
          payment_deadline: string | null
          payment_state: Database["public"]["Enums"]["booking_payment_state"]
          performance_fee: number | null
          status: string
          terms: string | null
        }
        Insert: {
          access_token?: string
          amount_paid?: number
          balance_amount?: number | null
          balance_requested_at?: string | null
          booking_currency?: string
          client_email: string
          client_name: string
          client_phone?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_type?: Database["public"]["Enums"]["deposit_type"]
          deposit_value?: number
          dj_id: string
          event_date?: string | null
          event_type?: string
          gig_state?: Database["public"]["Enums"]["booking_gig_state"]
          id?: string
          message?: string | null
          payment_deadline?: string | null
          payment_state?: Database["public"]["Enums"]["booking_payment_state"]
          performance_fee?: number | null
          status?: string
          terms?: string | null
        }
        Update: {
          access_token?: string
          amount_paid?: number
          balance_amount?: number | null
          balance_requested_at?: string | null
          booking_currency?: string
          client_email?: string
          client_name?: string
          client_phone?: string | null
          client_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_type?: Database["public"]["Enums"]["deposit_type"]
          deposit_value?: number
          dj_id?: string
          event_date?: string | null
          event_type?: string
          gig_state?: Database["public"]["Enums"]["booking_gig_state"]
          id?: string
          message?: string | null
          payment_deadline?: string | null
          payment_state?: Database["public"]["Enums"]["booking_payment_state"]
          performance_fee?: number | null
          status?: string
          terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_amount: number
          booking_currency: string
          booking_id: string
          client_email: string
          client_user_id: string | null
          confirmation_status: string | null
          created_at: string
          crypto_address: string | null
          crypto_amount: number | null
          crypto_asset: string | null
          crypto_network: string | null
          currency: string
          dj_id: string
          exchange_rate: number
          failure_reason: string | null
          id: string
          metadata: Json
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          provider: string
          provider_checkout_url: string | null
          provider_payment_id: string | null
          refunded_at: string | null
          transaction_hash: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          booking_amount: number
          booking_currency: string
          booking_id: string
          client_email?: string
          client_user_id?: string | null
          confirmation_status?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_amount?: number | null
          crypto_asset?: string | null
          crypto_network?: string | null
          currency: string
          dj_id: string
          exchange_rate?: number
          failure_reason?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          provider: string
          provider_checkout_url?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          transaction_hash?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_amount?: number
          booking_currency?: string
          booking_id?: string
          client_email?: string
          client_user_id?: string | null
          confirmation_status?: string | null
          created_at?: string
          crypto_address?: string | null
          crypto_amount?: number | null
          crypto_asset?: string | null
          crypto_network?: string | null
          currency?: string
          dj_id?: string
          exchange_rate?: number
          failure_reason?: string | null
          id?: string
          metadata?: Json
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          provider?: string
          provider_checkout_url?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          transaction_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_accounts: {
        Row: {
          charges_enabled: boolean
          connected_account_id: string | null
          country: string | null
          created_at: string
          details_submitted: boolean
          dj_id: string
          id: string
          last_synced_at: string | null
          payout_currency: string | null
          payout_method: Database["public"]["Enums"]["payout_method"]
          payouts_enabled: boolean
          provider: string
          requirements: Json
          status: Database["public"]["Enums"]["payout_account_status"]
          updated_at: string
          user_id: string
          wallet_address: string | null
          wallet_asset: string | null
          wallet_network: string | null
        }
        Insert: {
          charges_enabled?: boolean
          connected_account_id?: string | null
          country?: string | null
          created_at?: string
          details_submitted?: boolean
          dj_id: string
          id?: string
          last_synced_at?: string | null
          payout_currency?: string | null
          payout_method?: Database["public"]["Enums"]["payout_method"]
          payouts_enabled?: boolean
          provider?: string
          requirements?: Json
          status?: Database["public"]["Enums"]["payout_account_status"]
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          wallet_asset?: string | null
          wallet_network?: string | null
        }
        Update: {
          charges_enabled?: boolean
          connected_account_id?: string | null
          country?: string | null
          created_at?: string
          details_submitted?: boolean
          dj_id?: string
          id?: string
          last_synced_at?: string | null
          payout_currency?: string | null
          payout_method?: Database["public"]["Enums"]["payout_method"]
          payouts_enabled?: boolean
          provider?: string
          requirements?: Json
          status?: Database["public"]["Enums"]["payout_account_status"]
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          wallet_asset?: string | null
          wallet_network?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          booking_id: string
          connected_account_id: string | null
          created_at: string
          currency: string
          dj_id: string
          eligible_at: string | null
          failure_reason: string | null
          gross_amount: number
          id: string
          net_amount: number
          paid_at: string | null
          payment_id: string | null
          payout_status: Database["public"]["Enums"]["payout_status"]
          platform_fee: number
          platform_fee_percent: number
          provider: string
          provider_payout_id: string | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          connected_account_id?: string | null
          created_at?: string
          currency: string
          dj_id: string
          eligible_at?: string | null
          failure_reason?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          paid_at?: string | null
          payment_id?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          platform_fee: number
          platform_fee_percent: number
          provider?: string
          provider_payout_id?: string | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          connected_account_id?: string | null
          created_at?: string
          currency?: string
          dj_id?: string
          eligible_at?: string | null
          failure_reason?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          paid_at?: string | null
          payment_id?: string | null
          payout_status?: Database["public"]["Enums"]["payout_status"]
          platform_fee?: number
          platform_fee_percent?: number
          provider?: string
          provider_payout_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_dj_id_fkey"
            columns: ["dj_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          balance_due_days: number
          commission_percent: number
          created_at: string
          default_currency: string
          default_deposit_percent: number
          default_deposit_type: Database["public"]["Enums"]["deposit_type"]
          id: boolean
          payout_timing: Database["public"]["Enums"]["payout_timing"]
          supported_currencies: string[]
          supported_payment_methods: string[]
          updated_at: string
        }
        Insert: {
          balance_due_days?: number
          commission_percent?: number
          created_at?: string
          default_currency?: string
          default_deposit_percent?: number
          default_deposit_type?: Database["public"]["Enums"]["deposit_type"]
          id?: boolean
          payout_timing?: Database["public"]["Enums"]["payout_timing"]
          supported_currencies?: string[]
          supported_payment_methods?: string[]
          updated_at?: string
        }
        Update: {
          balance_due_days?: number
          commission_percent?: number
          created_at?: string
          default_currency?: string
          default_deposit_percent?: number
          default_deposit_type?: Database["public"]["Enums"]["deposit_type"]
          id?: boolean
          payout_timing?: Database["public"]["Enums"]["payout_timing"]
          supported_currencies?: string[]
          supported_payment_methods?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accepts_deposit: boolean
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          deposit_amount: number | null
          deposit_percent: number
          deposit_type: Database["public"]["Enums"]["deposit_type"]
          genres: string[] | null
          id: string
          location: string | null
          music_links: Json | null
          name: string
          past_events: Json | null
          photo_url: string | null
          press_kit_url: string | null
          rate: string | null
          rate_on_request: boolean
          referral_code: string | null
          referred_by: string | null
          slug: string | null
          social_links: Json | null
          soundcloud_url: string | null
          stage_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accepts_deposit?: boolean
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_percent?: number
          deposit_type?: Database["public"]["Enums"]["deposit_type"]
          genres?: string[] | null
          id?: string
          location?: string | null
          music_links?: Json | null
          name?: string
          past_events?: Json | null
          photo_url?: string | null
          press_kit_url?: string | null
          rate?: string | null
          rate_on_request?: boolean
          referral_code?: string | null
          referred_by?: string | null
          slug?: string | null
          social_links?: Json | null
          soundcloud_url?: string | null
          stage_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accepts_deposit?: boolean
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          deposit_amount?: number | null
          deposit_percent?: number
          deposit_type?: Database["public"]["Enums"]["deposit_type"]
          genres?: string[] | null
          id?: string
          location?: string | null
          music_links?: Json | null
          name?: string
          past_events?: Json | null
          photo_url?: string | null
          press_kit_url?: string | null
          rate?: string | null
          rate_on_request?: boolean
          referral_code?: string | null
          referred_by?: string | null
          slug?: string | null
          social_links?: Json | null
          soundcloud_url?: string | null
          stage_name?: string | null
          updated_at?: string
          user_id?: string
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
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_status: string
          provider: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_id: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_status?: string
          provider?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_referral_code: { Args: { _name: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_profile_owner: { Args: { profile_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "dj" | "booker"
      booking_gig_state: "PENDING" | "CONFIRMED" | "GIG_COMPLETED" | "CANCELLED"
      booking_payment_state:
        | "UNPAID"
        | "DEPOSIT_PAID"
        | "BALANCE_DUE"
        | "PAYMENT_COMPLETE"
        | "REFUNDED"
        | "CANCELLED"
      deposit_type: "PERCENTAGE" | "FIXED" | "FULL"
      payment_method: "CARD" | "PAYPAL" | "USDC" | "USDT" | "BTC"
      payment_status:
        | "PENDING"
        | "PROCESSING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "CANCELLED"
      payment_type: "DEPOSIT" | "BALANCE" | "FULL"
      payout_account_status:
        | "NOT_CONNECTED"
        | "ONBOARDING"
        | "PENDING_VERIFICATION"
        | "VERIFIED"
        | "PAYOUTS_ENABLED"
        | "RESTRICTED"
      payout_method: "CARD" | "USDT" | "USDC" | "SOL" | "ETH"
      payout_status:
        | "NOT_ELIGIBLE"
        | "PENDING"
        | "PROCESSING"
        | "PAID"
        | "FAILED"
        | "REVERSED"
      payout_timing: "IMMEDIATE" | "ON_GIG_COMPLETE" | "MANUAL"
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
      app_role: ["dj", "booker"],
      booking_gig_state: ["PENDING", "CONFIRMED", "GIG_COMPLETED", "CANCELLED"],
      booking_payment_state: [
        "UNPAID",
        "DEPOSIT_PAID",
        "BALANCE_DUE",
        "PAYMENT_COMPLETE",
        "REFUNDED",
        "CANCELLED",
      ],
      deposit_type: ["PERCENTAGE", "FIXED", "FULL"],
      payment_method: ["CARD", "PAYPAL", "USDC", "USDT", "BTC"],
      payment_status: [
        "PENDING",
        "PROCESSING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "CANCELLED",
      ],
      payment_type: ["DEPOSIT", "BALANCE", "FULL"],
      payout_account_status: [
        "NOT_CONNECTED",
        "ONBOARDING",
        "PENDING_VERIFICATION",
        "VERIFIED",
        "PAYOUTS_ENABLED",
        "RESTRICTED",
      ],
      payout_method: ["CARD", "USDT", "USDC", "SOL", "ETH"],
      payout_status: [
        "NOT_ELIGIBLE",
        "PENDING",
        "PROCESSING",
        "PAID",
        "FAILED",
        "REVERSED",
      ],
      payout_timing: ["IMMEDIATE", "ON_GIG_COMPLETE", "MANUAL"],
    },
  },
} as const
