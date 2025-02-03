export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
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
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      story_structures: {
        Row: {
          id: number
          lecture_id: number | null
          segment_1_title: string | null
          segment_2_title: string | null
          segment_3_title: string | null
          segment_4_title: string | null
          segment_5_title: string | null
          segment_6_title: string | null
          segment_7_title: string | null
          segment_8_title: string | null
          segment_9_title: string | null
          segment_10_title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          lecture_id?: number | null
          segment_1_title?: string | null
          segment_2_title?: string | null
          segment_3_title?: string | null
          segment_4_title?: string | null
          segment_5_title?: string | null
          segment_6_title?: string | null
          segment_7_title?: string | null
          segment_8_title?: string | null
          segment_9_title?: string | null
          segment_10_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          lecture_id?: number | null
          segment_1_title?: string | null
          segment_2_title?: string | null
          segment_3_title?: string | null
          segment_4_title?: string | null
          segment_5_title?: string | null
          segment_6_title?: string | null
          segment_7_title?: string | null
          segment_8_title?: string | null
          segment_9_title?: string | null
          segment_10_title?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_structures_lecture_id_fkey"
            columns: ["lecture_id"]
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          }
        ]
      }
      segment_contents: {
        Row: {
          id: number
          story_structure_id: number | null
          segment_number: number
          theory_slide_1: string | null
          theory_slide_2: string | null
          quiz_question_1: Json | null
          quiz_question_2: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          story_structure_id?: number | null
          segment_number: number
          theory_slide_1?: string | null
          theory_slide_2?: string | null
          quiz_question_1?: Json | null
          quiz_question_2?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          story_structure_id?: number | null
          segment_number?: number
          theory_slide_1?: string | null
          theory_slide_2?: string | null
          quiz_question_1?: Json | null
          quiz_question_2?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_contents_story_structure_id_fkey"
            columns: ["story_structure_id"]
            referencedRelation: "story_structures"
            referencedColumns: ["id"]
          }
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