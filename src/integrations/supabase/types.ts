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
          owner_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          owner_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          owner_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lecture_additional_resources: {
        Row: {
          created_at: string
          description: string
          id: number
          lecture_id: number | null
          resource_type: string
          sequence_number: number
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: number
          lecture_id?: number | null
          resource_type: string
          sequence_number: number
          title: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: number
          lecture_id?: number | null
          resource_type?: string
          sequence_number?: number
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_lecture_segments"
            columns: ["lecture_id", "sequence_number"]
            isOneToOne: false
            referencedRelation: "lecture_segments"
            referencedColumns: ["lecture_id", "sequence_number"]
          },
          {
            foreignKeyName: "lecture_additional_resources_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_ai_configs: {
        Row: {
          content_language: string | null
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
          content_language?: string | null
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
          content_language?: string | null
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
      lecture_highlights: {
        Row: {
          created_at: string | null
          full_content: string | null
          id: number
          important_quotes: string | null
          key_concepts: string | null
          lecture_id: number | null
          main_ideas: string | null
          relationships: string | null
          structure: string | null
          supporting_evidence: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_content?: string | null
          id?: number
          important_quotes?: string | null
          key_concepts?: string | null
          lecture_id?: number | null
          main_ideas?: string | null
          relationships?: string | null
          structure?: string | null
          supporting_evidence?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_content?: string | null
          id?: number
          important_quotes?: string | null
          key_concepts?: string | null
          lecture_id?: number | null
          main_ideas?: string | null
          relationships?: string | null
          structure?: string | null
          supporting_evidence?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lecture_highlights_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_segments: {
        Row: {
          created_at: string
          id: number
          lecture_id: number | null
          segment_description: string
          sequence_number: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: number
          lecture_id?: number | null
          segment_description?: string
          sequence_number: number
          title: string
        }
        Update: {
          created_at?: string
          id?: number
          lecture_id?: number | null
          segment_description?: string
          sequence_number?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecture_segments_lecture_id_fkey"
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
          original_language: string | null
          pdf_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_id?: number | null
          created_at?: string
          id?: number
          original_language?: string | null
          pdf_path?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_id?: number | null
          created_at?: string
          id?: number
          original_language?: string | null
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
          id?: number
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
          id?: number
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
      segments_content: {
        Row: {
          created_at: string
          id: number
          lecture_id: number | null
          quiz_1_correct_answer: string
          quiz_1_explanation: string
          quiz_1_options: string[] | null
          quiz_1_question: string
          quiz_1_type: string
          quiz_2_correct_answer: boolean
          quiz_2_explanation: string
          quiz_2_question: string
          quiz_2_type: string
          sequence_number: number
          theory_slide_1: string
          theory_slide_2: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          lecture_id?: number | null
          quiz_1_correct_answer?: string
          quiz_1_explanation?: string
          quiz_1_options?: string[] | null
          quiz_1_question?: string
          quiz_1_type?: string
          quiz_2_correct_answer?: boolean
          quiz_2_explanation?: string
          quiz_2_question?: string
          quiz_2_type?: string
          sequence_number: number
          theory_slide_1?: string
          theory_slide_2?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          lecture_id?: number | null
          quiz_1_correct_answer?: string
          quiz_1_explanation?: string
          quiz_1_options?: string[] | null
          quiz_1_question?: string
          quiz_1_type?: string
          quiz_2_correct_answer?: boolean
          quiz_2_explanation?: string
          quiz_2_question?: string
          quiz_2_type?: string
          sequence_number?: number
          theory_slide_1?: string
          theory_slide_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_content_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          id: number
          is_generated: boolean | null
          key_topics: string[]
          learning_steps: Json
          lecture_id: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_generated?: boolean | null
          key_topics?: string[]
          learning_steps?: Json
          lecture_id?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          is_generated?: boolean | null
          key_topics?: string[]
          learning_steps?: Json
          lecture_id?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_lecture_id_fkey"
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
          id?: number
          lecture_id?: number | null
          score?: number | null
          segment_number: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: number
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
      delete_segment_progress: {
        Args: {
          p_user_id: string
          p_lecture_id: number
          p_segment_number: number
        }
        Returns: undefined
      }
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
