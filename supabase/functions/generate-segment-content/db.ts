
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { GeneratedContent, SegmentRequest } from "./types.ts";

export const initSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

export const getLectureContent = async (supabaseClient: any, lectureId: number) => {
  const { data: lecture, error } = await supabaseClient
    .from('lectures')
    .select('content')
    .eq('id', lectureId)
    .single();

  if (error) {
    console.error('Failed to fetch lecture content:', error);
    throw new Error(`Failed to fetch lecture content: ${error.message}`);
  }

  if (!lecture?.content) {
    throw new Error('No content found for this lecture');
  }

  return lecture.content;
};

export const getExistingContent = async (supabaseClient: any, lectureId: number, segmentNumber: number) => {
  const { data: existingContent } = await supabaseClient
    .from('segments_content')
    .select('*')
    .eq('lecture_id', lectureId)
    .eq('sequence_number', segmentNumber)
    .single();

  return existingContent;
};

export const getAIConfig = async (supabaseClient: any, lectureId: number) => {
  const { data: aiConfig } = await supabaseClient
    .from('lecture_ai_configs')
    .select('*')
    .eq('lecture_id', lectureId)
    .maybeSingle();

  return aiConfig || {
    temperature: 0.7,
    creativity_level: 0.5,
    detail_level: 0.6,
    custom_instructions: ''
  };
};

export const saveSegmentContent = async (
  supabaseClient: any,
  lectureId: number,
  segmentNumber: number,
  content: GeneratedContent
) => {
  const { data: segmentContent, error: insertError } = await supabaseClient
    .from('segments_content')
    .insert({
      lecture_id: lectureId,
      sequence_number: segmentNumber,
      theory_slide_1: content.theory_slide_1,
      theory_slide_2: content.theory_slide_2,
      quiz_1_type: content.quiz_question_1.type,
      quiz_1_question: content.quiz_question_1.question,
      quiz_1_options: content.quiz_question_1.options,
      quiz_1_correct_answer: content.quiz_question_1.correctAnswer,
      quiz_1_explanation: content.quiz_question_1.explanation,
      quiz_2_type: content.quiz_question_2.type,
      quiz_2_question: content.quiz_question_2.question,
      quiz_2_correct_answer: content.quiz_question_2.correctAnswer,
      quiz_2_explanation: content.quiz_question_2.explanation
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error storing segment content:', insertError);
    throw new Error(`Failed to store segment content: ${insertError.message}`);
  }

  return segmentContent;
};
