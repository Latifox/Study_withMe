
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { AIConfig, GeneratedContent } from './types.ts';

export const initSupabaseClient = (authHeader?: string) => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authHeader || '',
        },
      },
    }
  );
};

export const getLectureContent = async (supabaseClient: any, lectureId: number) => {
  const { data, error } = await supabaseClient
    .from('lectures')
    .select('content')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  return data.content;
};

export const getAIConfig = async (supabaseClient: any, lectureId: number): Promise<AIConfig> => {
  const { data, error } = await supabaseClient
    .from('lecture_ai_configs')
    .select('*')
    .eq('lecture_id', lectureId)
    .maybeSingle();

  if (error) throw error;

  return {
    temperature: data?.temperature ?? 0.7,
    creativity_level: data?.creativity_level ?? 0.5,
    detail_level: data?.detail_level ?? 0.6,
    custom_instructions: data?.custom_instructions ?? '',
    content_language: data?.content_language ?? ''
  };
};

export const getExistingContent = async (supabaseClient: any, lectureId: number, segmentNumber: number) => {
  const { data, error } = await supabaseClient
    .from('segments_content')
    .select('*')
    .eq('lecture_id', lectureId)
    .eq('sequence_number', segmentNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const saveSegmentContent = async (
  supabaseClient: any,
  lectureId: number,
  segmentNumber: number,
  content: GeneratedContent
) => {
  const { error } = await supabaseClient
    .from('segments_content')
    .upsert({
      lecture_id: lectureId,
      sequence_number: segmentNumber,
      theory_slide_1: content.theory_slide_1,
      theory_slide_2: content.theory_slide_2,
      quiz_1_type: content.quiz_1_type,
      quiz_1_question: content.quiz_1_question,
      quiz_1_options: content.quiz_1_options,
      quiz_1_correct_answer: content.quiz_1_correct_answer,
      quiz_1_explanation: content.quiz_1_explanation,
      quiz_2_type: content.quiz_2_type,
      quiz_2_question: content.quiz_2_question,
      quiz_2_correct_answer: content.quiz_2_correct_answer,
      quiz_2_explanation: content.quiz_2_explanation
    }, {
      onConflict: 'lecture_id,sequence_number'
    });

  if (error) throw error;
};
