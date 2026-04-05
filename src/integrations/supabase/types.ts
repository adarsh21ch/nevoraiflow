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
      admin_subscription_plans: {
        Row: {
          billing_type: string
          created_at: string | null
          duration_days: number | null
          features: Json | null
          funnel_limit: number | null
          id: string
          is_active: boolean | null
          label: string
          plan_key: string
          price_inr: number
          tier: string
          video_limit: number | null
          video_max_size_mb: number | null
        }
        Insert: {
          billing_type: string
          created_at?: string | null
          duration_days?: number | null
          features?: Json | null
          funnel_limit?: number | null
          id?: string
          is_active?: boolean | null
          label: string
          plan_key: string
          price_inr: number
          tier: string
          video_limit?: number | null
          video_max_size_mb?: number | null
        }
        Update: {
          billing_type?: string
          created_at?: string | null
          duration_days?: number | null
          features?: Json | null
          funnel_limit?: number | null
          id?: string
          is_active?: boolean | null
          label?: string
          plan_key?: string
          price_inr?: number
          tier?: string
          video_limit?: number | null
          video_max_size_mb?: number | null
        }
        Relationships: []
      }
      funnel_lead_form_config: {
        Row: {
          capture_enabled: boolean | null
          capture_timing: string | null
          city_required: boolean | null
          custom_field_label: string | null
          custom_required: boolean | null
          email_required: boolean | null
          funnel_id: string
          id: string
          name_required: boolean | null
          phone_required: boolean | null
          show_city: boolean | null
          show_custom: boolean | null
          show_email: boolean | null
          show_name: boolean | null
          show_phone: boolean | null
        }
        Insert: {
          capture_enabled?: boolean | null
          capture_timing?: string | null
          city_required?: boolean | null
          custom_field_label?: string | null
          custom_required?: boolean | null
          email_required?: boolean | null
          funnel_id: string
          id?: string
          name_required?: boolean | null
          phone_required?: boolean | null
          show_city?: boolean | null
          show_custom?: boolean | null
          show_email?: boolean | null
          show_name?: boolean | null
          show_phone?: boolean | null
        }
        Update: {
          capture_enabled?: boolean | null
          capture_timing?: string | null
          city_required?: boolean | null
          custom_field_label?: string | null
          custom_required?: boolean | null
          email_required?: boolean | null
          funnel_id?: string
          id?: string
          name_required?: boolean | null
          phone_required?: boolean | null
          show_city?: boolean | null
          show_custom?: boolean | null
          show_email?: boolean | null
          show_name?: boolean | null
          show_phone?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_lead_form_config_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: true
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_leads: {
        Row: {
          city: string | null
          custom_value: string | null
          device_type: string | null
          email: string | null
          funnel_id: string
          id: string
          ip_address: string | null
          name: string | null
          notes: string | null
          phone: string | null
          status: string | null
          submitted_at: string | null
          tagged_at: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          watch_progress_at_submit: number | null
        }
        Insert: {
          city?: string | null
          custom_value?: string | null
          device_type?: string | null
          email?: string | null
          funnel_id: string
          id?: string
          ip_address?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          submitted_at?: string | null
          tagged_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          watch_progress_at_submit?: number | null
        }
        Update: {
          city?: string | null
          custom_value?: string | null
          device_type?: string | null
          email?: string | null
          funnel_id?: string
          id?: string
          ip_address?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          submitted_at?: string | null
          tagged_at?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          watch_progress_at_submit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_payments: {
        Row: {
          amount: number
          funnel_id: string
          id: string
          lead_id: string | null
          payment_type: string | null
          rejection_note: string | null
          screenshot_url: string | null
          selected_price_option_id: string | null
          status: string | null
          submitted_at: string | null
          upi_transaction_id: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          funnel_id: string
          id?: string
          lead_id?: string | null
          payment_type?: string | null
          rejection_note?: string | null
          screenshot_url?: string | null
          selected_price_option_id?: string | null
          status?: string | null
          submitted_at?: string | null
          upi_transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          funnel_id?: string
          id?: string
          lead_id?: string | null
          payment_type?: string | null
          rejection_note?: string | null
          screenshot_url?: string | null
          selected_price_option_id?: string | null
          status?: string | null
          submitted_at?: string | null
          upi_transaction_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_payments_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_payments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "funnel_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_payments_selected_price_option_id_fkey"
            columns: ["selected_price_option_id"]
            isOneToOne: false
            referencedRelation: "funnel_price_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_price_options: {
        Row: {
          amount: number
          description: string | null
          funnel_id: string
          id: string
          label: string
          position: number | null
        }
        Insert: {
          amount: number
          description?: string | null
          funnel_id: string
          id?: string
          label: string
          position?: number | null
        }
        Update: {
          amount?: number
          description?: string | null
          funnel_id?: string
          id?: string
          label?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_price_options_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_video_analytics: {
        Row: {
          device_type: string | null
          event_type: string
          funnel_id: string
          id: string
          lead_id: string | null
          progress_percent: number | null
          recorded_at: string | null
          session_id: string
          watch_seconds: number | null
        }
        Insert: {
          device_type?: string | null
          event_type: string
          funnel_id: string
          id?: string
          lead_id?: string | null
          progress_percent?: number | null
          recorded_at?: string | null
          session_id: string
          watch_seconds?: number | null
        }
        Update: {
          device_type?: string | null
          event_type?: string
          funnel_id?: string
          id?: string
          lead_id?: string | null
          progress_percent?: number | null
          recorded_at?: string | null
          session_id?: string
          watch_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "funnel_video_analytics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_video_analytics_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "funnel_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          allow_seek: boolean | null
          allow_speed_change: boolean | null
          audio_lock_video: boolean | null
          audio_note_autoplay: boolean | null
          audio_note_timing: string | null
          audio_note_url: string | null
          broadcast_password: string | null
          broadcast_replay_enabled: boolean | null
          broadcast_scheduled_at: string | null
          broadcast_status: string | null
          contact_instagram: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string | null
          cta_text: string | null
          cta_timing_seconds: number | null
          cta_url: string | null
          description: string | null
          id: string
          intent_type: string | null
          is_live_broadcast: boolean | null
          is_published: boolean | null
          lock_cta: boolean | null
          owner_id: string
          password_hash: string | null
          payment_enabled: boolean | null
          payment_instructions: string | null
          qr_code_url: string | null
          show_contact_after_cta: boolean | null
          show_contact_buttons: boolean | null
          slug: string
          thumbnail_url: string | null
          title: string
          total_leads: number | null
          total_payments: number | null
          total_play_time_seconds: number | null
          total_views: number | null
          updated_at: string | null
          upi_id: string | null
          video_access_minutes: number | null
          video_asset_id: string | null
          visibility: string | null
          whatsapp_auto_message: boolean | null
          whatsapp_message_template: string | null
        }
        Insert: {
          allow_seek?: boolean | null
          allow_speed_change?: boolean | null
          audio_lock_video?: boolean | null
          audio_note_autoplay?: boolean | null
          audio_note_timing?: string | null
          audio_note_url?: string | null
          broadcast_password?: string | null
          broadcast_replay_enabled?: boolean | null
          broadcast_scheduled_at?: string | null
          broadcast_status?: string | null
          contact_instagram?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_timing_seconds?: number | null
          cta_url?: string | null
          description?: string | null
          id?: string
          intent_type?: string | null
          is_live_broadcast?: boolean | null
          is_published?: boolean | null
          lock_cta?: boolean | null
          owner_id: string
          password_hash?: string | null
          payment_enabled?: boolean | null
          payment_instructions?: string | null
          qr_code_url?: string | null
          show_contact_after_cta?: boolean | null
          show_contact_buttons?: boolean | null
          slug: string
          thumbnail_url?: string | null
          title: string
          total_leads?: number | null
          total_payments?: number | null
          total_play_time_seconds?: number | null
          total_views?: number | null
          updated_at?: string | null
          upi_id?: string | null
          video_access_minutes?: number | null
          video_asset_id?: string | null
          visibility?: string | null
          whatsapp_auto_message?: boolean | null
          whatsapp_message_template?: string | null
        }
        Update: {
          allow_seek?: boolean | null
          allow_speed_change?: boolean | null
          audio_lock_video?: boolean | null
          audio_note_autoplay?: boolean | null
          audio_note_timing?: string | null
          audio_note_url?: string | null
          broadcast_password?: string | null
          broadcast_replay_enabled?: boolean | null
          broadcast_scheduled_at?: string | null
          broadcast_status?: string | null
          contact_instagram?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_timing_seconds?: number | null
          cta_url?: string | null
          description?: string | null
          id?: string
          intent_type?: string | null
          is_live_broadcast?: boolean | null
          is_published?: boolean | null
          lock_cta?: boolean | null
          owner_id?: string
          password_hash?: string | null
          payment_enabled?: boolean | null
          payment_instructions?: string | null
          qr_code_url?: string | null
          show_contact_after_cta?: boolean | null
          show_contact_buttons?: boolean | null
          slug?: string
          thumbnail_url?: string | null
          title?: string
          total_leads?: number | null
          total_payments?: number | null
          total_play_time_seconds?: number | null
          total_views?: number | null
          updated_at?: string | null
          upi_id?: string | null
          video_access_minutes?: number | null
          video_asset_id?: string | null
          visibility?: string | null
          whatsapp_auto_message?: boolean | null
          whatsapp_message_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funnels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_video_asset_id_fkey"
            columns: ["video_asset_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          instagram_url: string | null
          kyc_status: string | null
          kyc_verified_at: string | null
          onboarding_completed: boolean | null
          onboarding_data: Json | null
          phone: string | null
          team_size: string | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          instagram_url?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          phone?: string | null
          team_size?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          instagram_url?: string | null
          kyc_status?: string | null
          kyc_verified_at?: string | null
          onboarding_completed?: boolean | null
          onboarding_data?: Json | null
          phone?: string | null
          team_size?: string | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      user_kyc_submissions: {
        Row: {
          aadhar_back_url: string | null
          aadhar_front_url: string | null
          aadhar_number: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          full_name: string
          id: string
          pan_doc_url: string | null
          pan_number: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: string | null
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          aadhar_back_url?: string | null
          aadhar_front_url?: string | null
          aadhar_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          full_name: string
          id?: string
          pan_doc_url?: string | null
          pan_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          aadhar_back_url?: string | null
          aadhar_front_url?: string | null
          aadhar_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          full_name?: string
          id?: string
          pan_doc_url?: string | null
          pan_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: string | null
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_kyc_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_kyc_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      user_subscriptions: {
        Row: {
          amount_paid: number | null
          billing_type: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          plan_key: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_subscription_id: string | null
          started_at: string | null
          status: string | null
          tier: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          billing_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_key: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          started_at?: string | null
          status?: string | null
          tier: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          billing_type?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan_key?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          started_at?: string | null
          status?: string | null
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_asset_access: {
        Row: {
          granted_at: string | null
          granted_by: string
          granted_to: string
          id: string
          video_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by: string
          granted_to: string
          id?: string
          video_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string
          granted_to?: string
          id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_asset_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_asset_access_granted_to_fkey"
            columns: ["granted_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_asset_access_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      video_assets: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number | null
          error_message: string | null
          file_size_bytes: number | null
          folder_id: string | null
          id: string
          is_shared: boolean | null
          original_filename: string | null
          owner_id: string
          public_url: string | null
          r2_key: string | null
          r2_thumbnail_key: string | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          upload_percent: number | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_size_bytes?: number | null
          folder_id?: string | null
          id?: string
          is_shared?: boolean | null
          original_filename?: string | null
          owner_id: string
          public_url?: string | null
          r2_key?: string | null
          r2_thumbnail_key?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          upload_percent?: number | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          file_size_bytes?: number | null
          folder_id?: string | null
          id?: string
          is_shared?: boolean | null
          original_filename?: string | null
          owner_id?: string
          public_url?: string | null
          r2_key?: string | null
          r2_thumbnail_key?: string | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          upload_percent?: number | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "video_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_assets_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_folders: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          owner_id: string
          position: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_id: string
          position?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_id?: string
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "video_folders_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
