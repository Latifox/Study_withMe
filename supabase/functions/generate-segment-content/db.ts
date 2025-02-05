import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { GeneratedContent, SegmentRequest } from "./types.ts";

export const initSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

export const getStoryStructure = async (supabaseClient: any, lectureId: number) => {
  const { data: storyStructure, error: structureError } = await supabaseClient
    .from('story_structures')
    .select('id')
    .eq('lecture_id', lectureId)
    .single();

  if (structureError) {
    console.error('Failed to fetch story structure:', structureError);
    throw new Error(`Failed to fetch story structure: ${structureError.message}`);
  }

  return storyStructure;
};

export const getExistingContent = async (supabaseClient: any, storyStructureId: number, segmentNumber: number) => {
  const { data: existingContent } = await supabaseClient
    .from('segment_contents')
    .select('*')
    .eq('story_structure_id', storyStructureId)
    .eq('segment_number', segmentNumber)
    .single();

  return existingContent;
};

export const getLectureContent = async (supabaseClient: any, lectureId: number) => {
  const { data: lecture, error: lectureError } = await supabaseClient
    .from('lectures')
    .select('content')
    .eq('id', lectureId)
    .single();

  if (lectureError || !lecture?.content) {
    console.error('Failed to fetch lecture:', lectureError);
    throw new Error('Lecture content not found');
  }

  return lecture;
};

export const saveSegmentContent = async (
  supabaseClient: any,
  storyStructureId: number,
  segmentNumber: number,
  content: GeneratedContent
) => {
  const { data: segmentContent, error: insertError } = await supabaseClient
    .from('segment_contents')
    .insert({
      story_structure_id: storyStructureId,
      segment_number: segmentNumber,
      theory_slide_1: content.theory_slide_1,
      theory_slide_2: content.theory_slide_2,
      quiz_question_1: content.quiz_question_1,
      quiz_question_2: content.quiz_question_2
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error storing segment content:', insertError);
    throw new Error(`Failed to store segment content: ${insertError.message}`);
  }

  return segmentContent;
};

export const getSubjectContent = async (supabaseClient: any, lectureId: number, segmentNumber: number) => {
  // Get the subject for this segment based on chronological order
  const { data: subject, error: subjectError } = await supabaseClient
    .from('subject_definitions')
    .select('id, title, details')
    .eq('lecture_id', lectureId)
    .eq('chronological_order', segmentNumber)
    .single();

  if (subjectError) {
    console.error('Failed to fetch subject:', subjectError);
    return null;
  }

  if (!subject) return null;

  // Get the mapped content for this subject
  const { data: mappings, error: mappingError } = await supabaseClient
    .from('subject_content_mapping')
    .select('*')
    .eq('subject_id', subject.id)
    .order('relevance_score', { ascending: false });

  if (mappingError) {
    console.error('Failed to fetch content mappings:', mappingError);
    return null;
  }

  return {
    subject,
    mappings: mappings || []
  };
};
