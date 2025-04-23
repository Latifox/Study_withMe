-- Create tables based on the Database schema

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  course_code TEXT,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lectures table
CREATE TABLE IF NOT EXISTS public.lectures (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  pdf_path TEXT,
  original_language TEXT,
  course_id INTEGER REFERENCES public.courses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id SERIAL NOT NULL PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  lecture_id INTEGER REFERENCES public.lectures(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_quizzes table
CREATE TABLE IF NOT EXISTS public.generated_quizzes (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.lectures(id),
  user_id UUID NOT NULL,
  quiz_data JSONB NOT NULL,
  config JSONB NOT NULL,
  quiz_result INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lecture_additional_resources table
CREATE TABLE IF NOT EXISTS public.lecture_additional_resources (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER NOT NULL REFERENCES public.lectures(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lecture_ai_configs table
CREATE TABLE IF NOT EXISTS public.lecture_ai_configs (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.lectures(id) UNIQUE,
  creativity_level INTEGER DEFAULT 5,
  detail_level INTEGER DEFAULT 5,
  temperature NUMERIC DEFAULT 0.7,
  content_language TEXT,
  custom_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lecture_highlights table
CREATE TABLE IF NOT EXISTS public.lecture_highlights (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.lectures(id),
  full_content TEXT,
  key_concepts TEXT,
  main_ideas TEXT,
  important_quotes TEXT,
  supporting_evidence TEXT,
  structure TEXT,
  relationships TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lecture_podcast table
CREATE TABLE IF NOT EXISTS public.lecture_podcast (
  id SERIAL NOT NULL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.lectures(id),
  full_script TEXT NOT NULL,
  host_script TEXT NOT NULL,
  expert_script TEXT NOT NULL,
  student_script TEXT,
  audio_url TEXT,
  stored_audio_path TEXT,
  job_id TEXT,
  is_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create lecture_segments table
CREATE TABLE IF NOT EXISTS public.lecture_segments (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.lectures(id),
  title TEXT NOT NULL,
  segment_description TEXT DEFAULT '',
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professor_courses table
CREATE TABLE IF NOT EXISTS public.professor_courses (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  course_code TEXT,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professor_lectures table
CREATE TABLE IF NOT EXISTS public.professor_lectures (
  id SERIAL NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  pdf_path TEXT,
  original_language TEXT,
  professor_course_id INTEGER REFERENCES public.professor_courses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professor_lecture_segments table
CREATE TABLE IF NOT EXISTS public.professor_lecture_segments (
  id SERIAL NOT NULL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.professor_lectures(id),
  title TEXT NOT NULL,
  segment_description TEXT DEFAULT '',
  sequence_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create professor_segments_content table
CREATE TABLE IF NOT EXISTS public.professor_segments_content (
  id SERIAL NOT NULL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.professor_lectures(id),
  sequence_number INTEGER NOT NULL,
  theory_slide_1 TEXT DEFAULT '',
  theory_slide_2 TEXT DEFAULT '',
  quiz_1_question TEXT DEFAULT '',
  quiz_1_type TEXT DEFAULT 'multiple_choice',
  quiz_1_options TEXT[] DEFAULT '{}',
  quiz_1_correct_answer TEXT DEFAULT '',
  quiz_1_explanation TEXT DEFAULT '',
  quiz_2_question TEXT DEFAULT '',
  quiz_2_type TEXT DEFAULT 'true_false',
  quiz_2_correct_answer BOOLEAN DEFAULT FALSE,
  quiz_2_explanation TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_progress table
CREATE TABLE IF NOT EXISTS public.quiz_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  lecture_id INTEGER REFERENCES public.lectures(id),
  segment_number INTEGER NOT NULL,
  quiz_number INTEGER NOT NULL,
  quiz_score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create segments_content table
CREATE TABLE IF NOT EXISTS public.segments_content (
  id SERIAL PRIMARY KEY,
  lecture_id INTEGER REFERENCES public.lectures(id),
  sequence_number INTEGER NOT NULL,
  theory_slide_1 TEXT DEFAULT '',
  theory_slide_2 TEXT DEFAULT '',
  quiz_1_question TEXT DEFAULT '',
  quiz_1_type TEXT DEFAULT 'multiple_choice',
  quiz_1_options TEXT[] DEFAULT '{}',
  quiz_1_correct_answer TEXT DEFAULT '',
  quiz_1_explanation TEXT DEFAULT '',
  quiz_2_question TEXT DEFAULT '',
  quiz_2_type TEXT DEFAULT 'true_false',
  quiz_2_correct_answer BOOLEAN DEFAULT FALSE,
  quiz_2_explanation TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student_enrolled_courses table
CREATE TABLE IF NOT EXISTS public.student_enrolled_courses (
  id SERIAL NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id INTEGER REFERENCES public.professor_courses(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create study_plans table
CREATE TABLE IF NOT EXISTS public.study_plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  key_topics TEXT[] DEFAULT '{}',
  learning_steps JSONB DEFAULT '{}',
  lecture_id INTEGER REFERENCES public.lectures(id),
  is_generated BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS public.user_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  lecture_id INTEGER REFERENCES public.lectures(id),
  segment_number INTEGER NOT NULL,
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create custom function
CREATE OR REPLACE FUNCTION public.delete_segment_progress(
  p_user_id UUID,
  p_lecture_id INTEGER,
  p_segment_number INTEGER
) RETURNS VOID AS $$
BEGIN
  DELETE FROM public.user_progress
  WHERE user_id = p_user_id
  AND lecture_id = p_lecture_id
  AND segment_number = p_segment_number;
END;
$$ LANGUAGE plpgsql;

-- Create custom function for getting next segment content ID
CREATE OR REPLACE FUNCTION public.get_next_segment_content_id()
RETURNS INTEGER AS $$
DECLARE
  next_id INTEGER;
BEGIN
  SELECT COALESCE(MAX(id), 0) + 1 INTO next_id FROM public.segments_content;
  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_additional_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_ai_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_podcast ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lecture_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_lecture_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professor_segments_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrolled_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY; 