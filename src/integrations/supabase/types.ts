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
      lecture_chunks: {
        Row: {
          chunk_order: number
          content: string
          created_at: string
          id: number
          lecture_id: number | null
          updated_at: string
        }
        Insert: {
          chunk_order: number
          content: string
          created_at?: string
          id?: number
          lecture_id?: number | null
          updated_at?: string
        }
        Update: {
          chunk_order?: number
          content?: string
          created_at?: string
          id?: number
          lecture_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_chunks_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_polished_chunks: {
        Row: {
          chunk_order: number
          created_at: string
          id: number
          lecture_id: number | null
          original_content: string
          polished_content: string
        }
        Insert: {
          chunk_order: number
          created_at?: string
          id?: never
          lecture_id?: number | null
          original_content: string
          polished_content: string
        }
        Update: {
          chunk_order?: number
          created_at?: string
          id?: never
          lecture_id?: number | null
          original_content?: string
          polished_content?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_polished_chunks_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
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
      quiz_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: number
          lecture_id: number | null
          quiz_number: number
          quiz_score: number | null
          segment_number: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: never
          lecture_id?: number | null
          quiz_number: number
          quiz_score?: number | null
          segment_number: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: never
          lecture_id?: number | null
          quiz_number?: number
          quiz_score?: number | null
          segment_number?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_progress_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_contents: {
        Row: {
          created_at: string
          id: number
          quiz_question_1: Json | null
          quiz_question_2: Json | null
          segment_number: number
          story_structure_id: number | null
          theory_slide_1: string | null
          theory_slide_2: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          quiz_question_1?: Json | null
          quiz_question_2?: Json | null
          segment_number: number
          story_structure_id?: number | null
          theory_slide_1?: string | null
          theory_slide_2?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          quiz_question_1?: Json | null
          quiz_question_2?: Json | null
          segment_number?: number
          story_structure_id?: number | null
          theory_slide_1?: string | null
          theory_slide_2?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_contents_story_structure_id_fkey"
            columns: ["story_structure_id"]
            isOneToOne: false
            referencedRelation: "story_structures"
            referencedColumns: ["id"]
          },
        ]
      }
      story_structures: {
        Row: {
          created_at: string
          id: number
          lecture_id: number | null
          segment_1_title: string | null
          segment_10_title: string | null
          segment_2_title: string | null
          segment_3_title: string | null
          segment_4_title: string | null
          segment_5_title: string | null
          segment_6_title: string | null
          segment_7_title: string | null
          segment_8_title: string | null
          segment_9_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          lecture_id?: number | null
          segment_1_title?: string | null
          segment_10_title?: string | null
          segment_2_title?: string | null
          segment_3_title?: string | null
          segment_4_title?: string | null
          segment_5_title?: string | null
          segment_6_title?: string | null
          segment_7_title?: string | null
          segment_8_title?: string | null
          segment_9_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          lecture_id?: number | null
          segment_1_title?: string | null
          segment_10_title?: string | null
          segment_2_title?: string | null
          segment_3_title?: string | null
          segment_4_title?: string | null
          segment_5_title?: string | null
          segment_6_title?: string | null
          segment_7_title?: string | null
          segment_8_title?: string | null
          segment_9_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_structures_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_definitions: {
        Row: {
          chronological_order: number
          created_at: string
          details: string | null
          id: number
          lecture_id: number | null
          title: string
          updated_at: string
        }
        Insert: {
          chronological_order: number
          created_at?: string
          details?: string | null
          id?: never
          lecture_id?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          chronological_order?: number
          created_at?: string
          details?: string | null
          id?: never
          lecture_id?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_definitions_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: number
          lecture_id: number | null
          score: number | null
          segment_number: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: never
          lecture_id?: number | null
          score?: number | null
          segment_number: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: never
          lecture_id?: number | null
          score?: number | null
          segment_number?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_next_segment_content_id: {
        Args: Record<PropertyKey, never>
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
