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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      connection_requests: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          kind: Database["public"]["Enums"]["request_kind"]
          message: string
          startup_id: string
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          kind?: Database["public"]["Enums"]["request_kind"]
          message?: string
          startup_id: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          kind?: Database["public"]["Enums"]["request_kind"]
          message?: string
          startup_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_requests_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connection_requests_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          last_message_at: string
          startup_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          last_message_at?: string
          startup_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          last_message_at?: string
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_access: {
        Row: {
          decided_at: string | null
          downloads: number
          id: string
          investor_id: string
          requested_at: string
          startup_id: string
          status: Database["public"]["Enums"]["access_status"]
        }
        Insert: {
          decided_at?: string | null
          downloads?: number
          id?: string
          investor_id: string
          requested_at?: string
          startup_id: string
          status?: Database["public"]["Enums"]["access_status"]
        }
        Update: {
          decided_at?: string | null
          downloads?: number
          id?: string
          investor_id?: string
          requested_at?: string
          startup_id?: string
          status?: Database["public"]["Enums"]["access_status"]
        }
        Relationships: [
          {
            foreignKeyName: "data_room_access_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_room_access_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      data_room_documents: {
        Row: {
          category: string
          confidential: boolean
          created_at: string
          id: string
          mime_type: string
          name: string
          size_bytes: number
          startup_id: string
          storage_path: string | null
        }
        Insert: {
          category?: string
          confidential?: boolean
          created_at?: string
          id?: string
          mime_type?: string
          name: string
          size_bytes?: number
          startup_id: string
          storage_path?: string | null
        }
        Update: {
          category?: string
          confidential?: boolean
          created_at?: string
          id?: string
          mime_type?: string
          name?: string
          size_bytes?: number
          startup_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_room_documents_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          created_at: string
          geography: string
          id: string
          is_demo: boolean
          name: string
          organization: string
          sectors: string[]
          stages: string[]
          thesis: string
          ticket_max: number
          ticket_min: number
          type: string
          updated_at: string
          user_id: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          geography?: string
          id?: string
          is_demo?: boolean
          name?: string
          organization?: string
          sectors?: string[]
          stages?: string[]
          thesis?: string
          ticket_max?: number
          ticket_min?: number
          type?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          geography?: string
          id?: string
          is_demo?: boolean
          name?: string
          organization?: string
          sectors?: string[]
          stages?: string[]
          thesis?: string
          ticket_max?: number
          ticket_min?: number
          type?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      meetings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          investor_id: string
          minutes: number
          requested_by: Database["public"]["Enums"]["app_role"]
          scheduled_at: string
          startup_id: string
          status: Database["public"]["Enums"]["meeting_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id: string
          minutes?: number
          requested_by: Database["public"]["Enums"]["app_role"]
          scheduled_at: string
          startup_id: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          investor_id?: string
          minutes?: number
          requested_by?: Database["public"]["Enums"]["app_role"]
          scheduled_at?: string
          startup_id?: string
          status?: Database["public"]["Enums"]["meeting_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_by_investor: boolean
          read_by_student: boolean
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_by_investor?: boolean
          read_by_student?: boolean
          sender_id: string
          sender_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_by_investor?: boolean
          read_by_student?: boolean
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      nda_records: {
        Row: {
          accepted_at: string
          accepted_name: string
          id: string
          investor_id: string
          startup_id: string
          status: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          accepted_name: string
          id?: string
          investor_id: string
          startup_id: string
          status?: string
          user_id: string
          version?: string
        }
        Update: {
          accepted_at?: string
          accepted_name?: string
          id?: string
          investor_id?: string
          startup_id?: string
          status?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "nda_records_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nda_records_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          organization: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          organization?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_enrollments: {
        Row: {
          created_at: string
          id: string
          program_id: string
          startup_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          startup_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_enrollments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_enrollments_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          cohort: string
          created_at: string
          id: string
          is_demo: boolean
          mentor: string
          name: string
          owner_id: string | null
          seats: number
          starts_on: string | null
          status: Database["public"]["Enums"]["program_status"]
          updated_at: string
        }
        Insert: {
          cohort?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          mentor?: string
          name: string
          owner_id?: string | null
          seats?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string
        }
        Update: {
          cohort?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          mentor?: string
          name?: string
          owner_id?: string | null
          seats?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          updated_at?: string
        }
        Relationships: []
      }
      readiness_results: {
        Row: {
          analysis: string
          breakdown: Json
          generated_at: string
          id: string
          provider: string
          recommendations: Json
          score: number
          startup_id: string
          strengths: Json
          version: string
          weaknesses: Json
        }
        Insert: {
          analysis?: string
          breakdown?: Json
          generated_at?: string
          id?: string
          provider?: string
          recommendations?: Json
          score: number
          startup_id: string
          strengths?: Json
          version?: string
          weaknesses?: Json
        }
        Update: {
          analysis?: string
          breakdown?: Json
          generated_at?: string
          id?: string
          provider?: string
          recommendations?: Json
          score?: number
          startup_id?: string
          strengths?: Json
          version?: string
          weaknesses?: Json
        }
        Relationships: [
          {
            foreignKeyName: "readiness_results_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_startups: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          startup_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          startup_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_startups_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investor_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_startups_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startup_reviews: {
        Row: {
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["startup_status"]
          note: string
          previous_status: Database["public"]["Enums"]["startup_status"] | null
          reviewer_id: string | null
          reviewer_name: string
          startup_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["startup_status"]
          note?: string
          previous_status?: Database["public"]["Enums"]["startup_status"] | null
          reviewer_id?: string | null
          reviewer_name?: string
          startup_id: string
        }
        Update: {
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["startup_status"]
          note?: string
          previous_status?: Database["public"]["Enums"]["startup_status"] | null
          reviewer_id?: string | null
          reviewer_name?: string
          startup_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "startup_reviews_startup_id_fkey"
            columns: ["startup_id"]
            isOneToOne: false
            referencedRelation: "startups"
            referencedColumns: ["id"]
          },
        ]
      }
      startups: {
        Row: {
          business_model: string
          created_at: string
          deck_name: string
          deck_path: string | null
          funding_required: number
          github_checked_at: string | null
          github_forks: number | null
          github_pushed_at: string | null
          github_stars: number | null
          github_url: string
          id: string
          is_demo: boolean
          location: string
          monthly_users: number
          name: string
          owner_id: string | null
          problem: string
          readiness: number
          revenue: boolean
          review_note: string
          sector: string
          solution: string
          stage: string
          status: Database["public"]["Enums"]["startup_status"]
          tagline: string
          team_size: number
          traction: string
          university: string
          updated_at: string
          verified: boolean
          video_url: string
          views: number
        }
        Insert: {
          business_model?: string
          created_at?: string
          deck_name?: string
          deck_path?: string | null
          funding_required?: number
          github_checked_at?: string | null
          github_forks?: number | null
          github_pushed_at?: string | null
          github_stars?: number | null
          github_url?: string
          id?: string
          is_demo?: boolean
          location?: string
          monthly_users?: number
          name?: string
          owner_id?: string | null
          problem?: string
          readiness?: number
          revenue?: boolean
          review_note?: string
          sector?: string
          solution?: string
          stage?: string
          status?: Database["public"]["Enums"]["startup_status"]
          tagline?: string
          team_size?: number
          traction?: string
          university?: string
          updated_at?: string
          verified?: boolean
          video_url?: string
          views?: number
        }
        Update: {
          business_model?: string
          created_at?: string
          deck_name?: string
          deck_path?: string | null
          funding_required?: number
          github_checked_at?: string | null
          github_forks?: number | null
          github_pushed_at?: string | null
          github_stars?: number | null
          github_url?: string
          id?: string
          is_demo?: boolean
          location?: string
          monthly_users?: number
          name?: string
          owner_id?: string | null
          problem?: string
          readiness?: number
          revenue?: boolean
          review_note?: string
          sector?: string
          solution?: string
          stage?: string
          status?: Database["public"]["Enums"]["startup_status"]
          tagline?: string
          team_size?: number
          traction?: string
          university?: string
          updated_at?: string
          verified?: boolean
          video_url?: string
          views?: number
        }
        Relationships: []
      }
      students: {
        Row: {
          branch: string
          created_at: string
          email: string
          id: string
          is_demo: boolean
          name: string
          university: string
          updated_at: string
          user_id: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          year: string
        }
        Insert: {
          branch?: string
          created_at?: string
          email?: string
          id?: string
          is_demo?: boolean
          name?: string
          university?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          year?: string
        }
        Update: {
          branch?: string
          created_at?: string
          email?: string
          id?: string
          is_demo?: boolean
          name?: string
          university?: string
          updated_at?: string
          user_id?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          year?: string
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
      [_ in never]: never
    }
    Enums: {
      access_status: "pending" | "granted" | "revoked"
      app_role: "student" | "investor" | "university" | "admin"
      meeting_status: "requested" | "confirmed" | "declined" | "cancelled"
      program_status: "open" | "running" | "closed" | "archived"
      request_kind: "connection" | "dataroom"
      request_status: "pending" | "accepted" | "declined" | "cancelled"
      startup_status: "draft" | "pending" | "approved" | "rejected"
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
      access_status: ["pending", "granted", "revoked"],
      app_role: ["student", "investor", "university", "admin"],
      meeting_status: ["requested", "confirmed", "declined", "cancelled"],
      program_status: ["open", "running", "closed", "archived"],
      request_kind: ["connection", "dataroom"],
      request_status: ["pending", "accepted", "declined", "cancelled"],
      startup_status: ["draft", "pending", "approved", "rejected"],
    },
  },
} as const
