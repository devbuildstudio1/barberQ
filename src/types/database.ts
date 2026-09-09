export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      barbers: {
        Row: {
          availability: Database["public"]["Enums"]["barber_availability"]
          created_at: string
          experience_years: number
          id: string
          image: string | null
          name: string
          shop_id: string
          specialization: string | null
          status: Database["public"]["Enums"]["barber_status"]
          updated_at: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["barber_availability"]
          created_at?: string
          experience_years?: number
          id?: string
          image?: string | null
          name: string
          shop_id: string
          specialization?: string | null
          status?: Database["public"]["Enums"]["barber_status"]
          updated_at?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["barber_availability"]
          created_at?: string
          experience_years?: number
          id?: string
          image?: string | null
          name?: string
          shop_id?: string
          specialization?: string | null
          status?: Database["public"]["Enums"]["barber_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "barbers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          id: string
          message: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          message: string
          read?: boolean
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_entries: {
        Row: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          barber_id?: string | null
          called_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          estimated_duration_minutes: number
          id?: string
          joined_at?: string
          last_ahead_notified?: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          barber_id?: string | null
          called_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          estimated_duration_minutes?: number
          id?: string
          joined_at?: string
          last_ahead_notified?: number | null
          queue_date?: string
          queue_id?: string
          service_id?: string
          shop_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["queue_entry_status"]
          token_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_entries_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          barber_id: string | null
          created_at: string
          current_token: number | null
          id: string
          last_token_number: number
          queue_date: string
          shop_id: string
          status: Database["public"]["Enums"]["queue_status"]
          token_prefix: string
          updated_at: string
          waiting_count: number
        }
        Insert: {
          barber_id?: string | null
          created_at?: string
          current_token?: number | null
          id?: string
          last_token_number?: number
          queue_date?: string
          shop_id: string
          status?: Database["public"]["Enums"]["queue_status"]
          token_prefix?: string
          updated_at?: string
          waiting_count?: number
        }
        Update: {
          barber_id?: string | null
          created_at?: string
          current_token?: number | null
          id?: string
          last_token_number?: number
          queue_date?: string
          shop_id?: string
          status?: Database["public"]["Enums"]["queue_status"]
          token_prefix?: string
          updated_at?: string
          waiting_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "queues_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          barber_id: string | null
          created_at: string
          id: string
          is_hidden: boolean
          queue_entry_id: string | null
          rating: number
          review: string | null
          shop_id: string
          user_id: string
        }
        Insert: {
          barber_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          queue_entry_id?: string | null
          rating: number
          review?: string | null
          shop_id: string
          user_id: string
        }
        Update: {
          barber_id?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          queue_entry_id?: string | null
          rating?: number
          review?: string | null
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_queue_entry_id_fkey"
            columns: ["queue_entry_id"]
            isOneToOne: true
            referencedRelation: "queue_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price: number
          shop_id: string
          sort_order: number
          status: Database["public"]["Enums"]["service_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes: number
          id?: string
          name: string
          price: number
          shop_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          shop_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["service_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string
          approved_at: string | null
          city: string | null
          closing_time: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          image: string | null
          images: string[]
          is_open: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_time: string
          owner_id: string
          phone: string | null
          queue_paused: boolean
          rating: number
          rejection_reason: string | null
          review_count: number
          status: Database["public"]["Enums"]["shop_status"]
          updated_at: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          city?: string | null
          closing_time?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          image?: string | null
          images?: string[]
          is_open?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_time?: string
          owner_id: string
          phone?: string | null
          queue_paused?: boolean
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          status?: Database["public"]["Enums"]["shop_status"]
          updated_at?: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          city?: string | null
          closing_time?: string
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          image?: string | null
          images?: string[]
          is_open?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_time?: string
          owner_id?: string
          phone?: string | null
          queue_paused?: boolean
          rating?: number
          rejection_reason?: string | null
          review_count?: number
          status?: Database["public"]["Enums"]["shop_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          phone: string | null
          profile_image: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          profile_image?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          phone?: string | null
          profile_image?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_daily_report: { Args: { p_days?: number }; Returns: Json }
      admin_set_shop_status: {
        Args: {
          p_reason?: string
          p_shop_id: string
          p_status: Database["public"]["Enums"]["shop_status"]
        }
        Returns: {
          address: string
          approved_at: string | null
          city: string | null
          closing_time: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          image: string | null
          images: string[]
          is_open: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_time: string
          owner_id: string
          phone: string | null
          queue_paused: boolean
          rating: number
          rejection_reason: string | null
          review_count: number
          status: Database["public"]["Enums"]["shop_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_stats: { Args: never; Returns: Json }
      app_local_time: { Args: never; Returns: string }
      app_now: { Args: never; Returns: string }
      app_timezone: { Args: never; Returns: string }
      app_today: { Args: never; Returns: string }
      call_next: {
        Args: { p_queue_id: string }
        Returns: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "queue_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_manage_shop: { Args: { p_shop_id: string }; Returns: boolean }
      can_review_entry: { Args: { p_entry_id: string }; Returns: boolean }
      cancel_queue_entry: {
        Args: { p_entry_id: string }
        Returns: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "queue_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_service: {
        Args: { p_entry_id: string }
        Returns: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "queue_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_notification: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
        }
        Returns: string
      }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      distance_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      ensure_today_queues: { Args: { p_shop_id: string }; Returns: undefined }
      estimate_wait_minutes: {
        Args: { p_before_token?: number; p_queue_id: string }
        Returns: number
      }
      get_my_active_queue_entry: { Args: never; Returns: Json }
      get_my_reviewable_visits: { Args: never; Returns: Json }
      get_queue_snapshot: { Args: { p_queue_id: string }; Returns: Json }
      get_shop_live_status: { Args: { p_shop_id: string }; Returns: Json }
      get_shop_queue_board: {
        Args: { p_date?: string; p_shop_id: string }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      join_queue: {
        Args: { p_barber_id?: string; p_service_id: string; p_shop_id: string }
        Returns: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "queue_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_public_shops: {
        Args: {
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_query?: string
        }
        Returns: {
          address: string
          barber_count: number
          city: string
          closing_time: string
          created_at: string
          description: string
          distance_km: number
          estimated_wait_minutes: number
          id: string
          image: string
          images: string[]
          is_open: boolean
          latitude: number
          longitude: number
          min_price: number
          name: string
          opening_time: string
          queue_paused: boolean
          rating: number
          review_count: number
          waiting_count: number
        }[]
      }
      lock_entry_for_staff: {
        Args: { p_entry_id: string }
        Returns: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "queue_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lock_or_create_queue: {
        Args: { p_barber_id: string; p_shop_id: string }
        Returns: {
          barber_id: string | null
          created_at: string
          current_token: number | null
          id: string
          last_token_number: number
          queue_date: string
          shop_id: string
          status: Database["public"]["Enums"]["queue_status"]
          token_prefix: string
          updated_at: string
          waiting_count: number
        }
        SetofOptions: {
          from: "*"
          to: "queues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_no_show: {
        Args: { p_entry_id: string }
        Returns: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "queue_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notify_queue_positions: {
        Args: { p_queue_id: string }
        Returns: undefined
      }
      owns_shop: { Args: { p_shop_id: string }; Returns: boolean }
      queue_prefix_for: {
        Args: { p_barber_id: string; p_shop_id: string }
        Returns: string
      }
      set_shop_open: {
        Args: { p_open: boolean; p_shop_id: string }
        Returns: {
          address: string
          approved_at: string | null
          city: string | null
          closing_time: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          image: string | null
          images: string[]
          is_open: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_time: string
          owner_id: string
          phone: string | null
          queue_paused: boolean
          rating: number
          rejection_reason: string | null
          review_count: number
          status: Database["public"]["Enums"]["shop_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_shop_queue_paused: {
        Args: { p_paused: boolean; p_shop_id: string }
        Returns: {
          address: string
          approved_at: string | null
          city: string | null
          closing_time: string
          created_at: string
          description: string | null
          email: string | null
          id: string
          image: string | null
          images: string[]
          is_open: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_time: string
          owner_id: string
          phone: string | null
          queue_paused: boolean
          rating: number
          rejection_reason: string | null
          review_count: number
          status: Database["public"]["Enums"]["shop_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shops"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      shop_is_open_now: {
        Args: { p_shop: Database["public"]["Tables"]["shops"]["Row"] }
        Returns: boolean
      }
      start_service: {
        Args: { p_entry_id: string }
        Returns: {
          barber_id: string | null
          called_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          estimated_duration_minutes: number
          id: string
          joined_at: string
          last_ahead_notified: number | null
          queue_date: string
          queue_id: string
          service_id: string
          shop_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["queue_entry_status"]
          token_number: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "queue_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      barber_availability: "available" | "on_break" | "off_duty"
      barber_status: "active" | "inactive"
      notification_type:
        | "queue_joined"
        | "ahead_two"
        | "ahead_one"
        | "turn_approaching"
        | "your_turn"
        | "queue_cancelled"
        | "no_show"
        | "service_completed"
        | "shop_approved"
        | "shop_rejected"
        | "shop_suspended"
        | "system"
      queue_entry_status:
        | "waiting"
        | "called"
        | "serving"
        | "completed"
        | "cancelled"
        | "no_show"
      queue_status: "active" | "paused" | "closed"
      service_status: "active" | "inactive"
      shop_status: "pending" | "approved" | "rejected" | "suspended"
      user_role: "customer" | "shop_owner" | "admin"
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
      barber_availability: ["available", "on_break", "off_duty"],
      barber_status: ["active", "inactive"],
      notification_type: [
        "queue_joined",
        "ahead_two",
        "ahead_one",
        "turn_approaching",
        "your_turn",
        "queue_cancelled",
        "no_show",
        "service_completed",
        "shop_approved",
        "shop_rejected",
        "shop_suspended",
        "system",
      ],
      queue_entry_status: [
        "waiting",
        "called",
        "serving",
        "completed",
        "cancelled",
        "no_show",
      ],
      queue_status: ["active", "paused", "closed"],
      service_status: ["active", "inactive"],
      shop_status: ["pending", "approved", "rejected", "suspended"],
      user_role: ["customer", "shop_owner", "admin"],
    },
  },
} as const

