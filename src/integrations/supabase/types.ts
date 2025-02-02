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
      course_access: {
        Row: {
          access_type: string
          course_id: number | null
          created_at: string
          id: number
          updated_at: string
          user_email: string
        }
        Insert: {
          access_type: string
          course_id?: number | null
          created_at?: string
          id?: number
          updated_at?: string
          user_email: string
        }
        Update: {
          access_type?: string
          course_id?: number | null
          created_at?: string
          id?: number
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_invites: {
        Row: {
          course_id: number | null
          created_at: string
          id: number
          invite_code: string
          updated_at: string
        }
        Insert: {
          course_id?: number | null
          created_at?: string
          id?: number
          invite_code: string
          updated_at?: string
        }
        Update: {
          course_id?: number | null
          created_at?: string
          id?: number
          invite_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_invites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          id: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      invited_course_access: {
        Row: {
          created_at: string
          id: number
          invited_course_id: number | null
          updated_at: string
          user_email: string
        }
        Insert: {
          created_at?: string
          id?: number
          invited_course_id?: number | null
          updated_at?: string
          user_email: string
        }
        Update: {
          created_at?: string
          id?: number
          invited_course_id?: number | null
          updated_at?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "invited_course_access_invited_course_id_fkey"
            columns: ["invited_course_id"]
            isOneToOne: false
            referencedRelation: "invited_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      invited_courses: {
        Row: {
          created_at: string
          id: number
          invite_code: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          invite_code: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          invite_code?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lecture_ai_configs: {
        Row: {
          created_at: string
          creativity_level: number
          custom_instructions: string | null
          detail_level: number
          id: number
          lecture_id: number | null
          temperature: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          creativity_level?: number
          custom_instructions?: string | null
          detail_level?: number
          id?: number
          lecture_id?: number | null
          temperature?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          creativity_level?: number
          custom_instructions?: string | null
          detail_level?: number
          id?: number
          lecture_id?: number | null
          temperature?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_ai_configs_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: true
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lectures: {
        Row: {
          content: string | null
          course_id: number | null
          created_at: string
          id: number
          pdf_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_id?: number | null
          created_at?: string
          id?: number
          pdf_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_id?: number | null
          created_at?: string
          id?: number
          pdf_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lectures_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
