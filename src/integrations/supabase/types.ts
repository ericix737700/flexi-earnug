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
      achievement_claims: {
        Row: {
          achievement_id: string
          claimed_at: string
          id: string
          reward_amount: number
          user_id: string
        }
        Insert: {
          achievement_id: string
          claimed_at?: string
          id?: string
          reward_amount: number
          user_id: string
        }
        Update: {
          achievement_id?: string
          claimed_at?: string
          id?: string
          reward_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_claims_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          key: string
          reward_amount: number
          sort_order: number
          threshold: number
          title: string
          updated_at: string
        }
        Insert: {
          achievement_type: Database["public"]["Enums"]["achievement_type"]
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key: string
          reward_amount?: number
          sort_order?: number
          threshold?: number
          title: string
          updated_at?: string
        }
        Update: {
          achievement_type?: Database["public"]["Enums"]["achievement_type"]
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          key?: string
          reward_amount?: number
          sort_order?: number
          threshold?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_packages: {
        Row: {
          created_at: string
          days: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          days: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          ad_type: Database["public"]["Enums"]["ad_type"]
          click_count: number
          cost: number
          created_at: string
          cta_text: string | null
          days: number
          description: string | null
          end_date: string | null
          id: string
          impression_count: number
          media_type: string | null
          media_url: string | null
          package_id: string | null
          paid: boolean
          payment_method:
            | Database["public"]["Enums"]["ad_payment_method"]
            | null
          placement: Database["public"]["Enums"]["ad_placement"]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["ad_status"]
          target_url: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          click_count?: number
          cost?: number
          created_at?: string
          cta_text?: string | null
          days: number
          description?: string | null
          end_date?: string | null
          id?: string
          impression_count?: number
          media_type?: string | null
          media_url?: string | null
          package_id?: string | null
          paid?: boolean
          payment_method?:
            | Database["public"]["Enums"]["ad_payment_method"]
            | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          target_url?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ad_type?: Database["public"]["Enums"]["ad_type"]
          click_count?: number
          cost?: number
          created_at?: string
          cta_text?: string | null
          days?: number
          description?: string | null
          end_date?: string | null
          id?: string
          impression_count?: number
          media_type?: string | null
          media_url?: string | null
          package_id?: string | null
          paid?: boolean
          payment_method?:
            | Database["public"]["Enums"]["ad_payment_method"]
            | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["ad_status"]
          target_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      deposits: {
        Row: {
          amount: number
          created_at: string
          id: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_code_redemptions: {
        Row: {
          amount: number
          gift_code_id: string
          id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          amount: number
          gift_code_id: string
          id?: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          gift_code_id?: string
          id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_code_redemptions_gift_code_id_fkey"
            columns: ["gift_code_id"]
            isOneToOne: false
            referencedRelation: "gift_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_codes: {
        Row: {
          amount: number
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          updated_at: string
          uses_count: number
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          uses_count?: number
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      investment_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          investment_id: string | null
          machine_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          investment_id?: string | null
          machine_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          investment_id?: string | null
          machine_id?: string | null
        }
        Relationships: []
      }
      investment_machines: {
        Row: {
          created_at: string
          description: string | null
          duration_hours: number
          id: string
          image_url: string | null
          is_visible: boolean
          max_per_user: number
          max_total: number
          name: string
          price: number
          purchases_count: number
          reward_amount: number
          series: string | null
          sort_order: number
          status: Database["public"]["Enums"]["machine_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          max_per_user?: number
          max_total?: number
          name: string
          price?: number
          purchases_count?: number
          reward_amount?: number
          series?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["machine_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_hours?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          max_per_user?: number
          max_total?: number
          name?: string
          price?: number
          purchases_count?: number
          reward_amount?: number
          series?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["machine_status"]
          updated_at?: string
        }
        Relationships: []
      }
      login_audit: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_fingerprint: string | null
          event_type: string
          id: string
          ip_address: string | null
          isp: string | null
          region: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          isp?: string | null
          region?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_fingerprint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          isp?: string | null
          region?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      news_items: {
        Row: {
          body: string | null
          category: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          image_url: string | null
          is_published: boolean
          link_url: string | null
          pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          link_url?: string | null
          pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          category?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          link_url?: string | null
          pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          id: string
          investment_maturity: boolean
          promotions: boolean
          push_enabled: boolean
          reward_credits: boolean
          updated_at: string
          user_id: string
          wallet_deductions: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          investment_maturity?: boolean
          promotions?: boolean
          push_enabled?: boolean
          reward_credits?: boolean
          updated_at?: string
          user_id: string
          wallet_deductions?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          investment_maturity?: boolean
          promotions?: boolean
          push_enabled?: boolean
          reward_credits?: boolean
          updated_at?: string
          user_id?: string
          wallet_deductions?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          notification_type: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          notification_type?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_id: string
          balance: number
          created_at: string
          daily_checkin_streak: number
          device_fingerprint: string | null
          email: string | null
          full_name: string | null
          id: string
          is_verified: boolean
          last_checkin_date: string | null
          last_seen: string | null
          network_provider: string | null
          phone: string
          referral_code: string
          referred_by: string | null
          registration_paid: boolean
          restrictions: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string
          balance?: number
          created_at?: string
          daily_checkin_streak?: number
          device_fingerprint?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean
          last_checkin_date?: string | null
          last_seen?: string | null
          network_provider?: string | null
          phone: string
          referral_code?: string
          referred_by?: string | null
          registration_paid?: boolean
          restrictions?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          balance?: number
          created_at?: string
          daily_checkin_streak?: number
          device_fingerprint?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean
          last_checkin_date?: string | null
          last_seen?: string | null
          network_provider?: string | null
          phone?: string
          referral_code?: string
          referred_by?: string | null
          registration_paid?: boolean
          restrictions?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          id: string
          reward_earned: number
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          reward_earned?: number
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          reward_earned?: number
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          daily_limit: number | null
          description: string | null
          id: string
          is_active: boolean
          reward_amount: number
          survey_questions: Json | null
          task_type: string
          title: string
          trivia_questions: Json | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          reward_amount?: number
          survey_questions?: Json | null
          task_type?: string
          title: string
          trivia_questions?: Json | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          reward_amount?: number
          survey_questions?: Json | null
          task_type?: string
          title?: string
          trivia_questions?: Json | null
          video_url?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_investments: {
        Row: {
          amount_paid: number
          completed_at: string | null
          created_at: string
          id: string
          machine_id: string
          machine_name: string
          matures_at: string
          reward_amount: number
          starts_at: string
          status: Database["public"]["Enums"]["investment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid: number
          completed_at?: string | null
          created_at?: string
          id?: string
          machine_id: string
          machine_name: string
          matures_at: string
          reward_amount: number
          starts_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          machine_id?: string
          machine_name?: string
          matures_at?: string
          reward_amount?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["investment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_investments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "investment_machines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          marzpay_reference: string | null
          network: string
          phone_number: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          marzpay_reference?: string | null
          network: string
          phone_number: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          marzpay_reference?: string | null
          network?: string
          phone_number?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_achievement: { Args: { _achievement_id: string }; Returns: Json }
      find_referrer_by_code: { Args: { _code: string }; Returns: string }
      generate_account_id: { Args: never; Returns: string }
      get_own_profile_id: { Args: never; Returns: string }
      get_referrer_preview: {
        Args: { _code: string }
        Returns: {
          account_id: string
          full_name: string
          is_verified: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_gift_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      achievement_type:
        | "first_task"
        | "tasks_count"
        | "login_streak"
        | "referrals"
        | "custom"
      ad_payment_method: "balance" | "mobile_money" | "admin"
      ad_placement: "dashboard" | "tasks" | "popup" | "ads_page" | "all"
      ad_status:
        | "draft"
        | "pending_payment"
        | "pending_review"
        | "approved"
        | "rejected"
        | "active"
        | "paused"
        | "expired"
      ad_type:
        | "banner"
        | "popup"
        | "inline"
        | "video"
        | "native"
        | "sponsored"
        | "notification"
      app_role: "admin" | "moderator" | "user"
      investment_status: "active" | "completed" | "cancelled" | "refunded"
      machine_status: "active" | "coming_soon" | "sold_out" | "disabled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      achievement_type: [
        "first_task",
        "tasks_count",
        "login_streak",
        "referrals",
        "custom",
      ],
      ad_payment_method: ["balance", "mobile_money", "admin"],
      ad_placement: ["dashboard", "tasks", "popup", "ads_page", "all"],
      ad_status: [
        "draft",
        "pending_payment",
        "pending_review",
        "approved",
        "rejected",
        "active",
        "paused",
        "expired",
      ],
      ad_type: [
        "banner",
        "popup",
        "inline",
        "video",
        "native",
        "sponsored",
        "notification",
      ],
      app_role: ["admin", "moderator", "user"],
      investment_status: ["active", "completed", "cancelled", "refunded"],
      machine_status: ["active", "coming_soon", "sold_out", "disabled"],
    },
  },
} as const
