import { supabase } from "@/integrations/supabase/client";

export const deleteExistingContent = async (lectureId: number) => {
  // Delete quiz progress
  console.log('Deleting quiz progress...');
  const { error: quizError } = await supabase
    .from('quiz_progress')
    .delete()
    .eq('lecture_id', lectureId);

  if (quizError) {
    console.error('Error deleting quiz progress:', quizError);
    throw quizError;
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Delete user progress
  console.log('Deleting user progress...');
  const { error: progressError } = await supabase
    .from('user_progress')
    .delete()
    .eq('lecture_id', lectureId);

  if (progressError) {
    console.error('Error deleting user progress:', progressError);
    throw progressError;
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Delete segments content
  console.log('Deleting segments content...');
  const { error: contentError } = await supabase
    .from('segments_content')
    .delete()
    .eq('lecture_id', lectureId);

  if (contentError) {
    console.error('Error deleting segments content:', contentError);
    throw contentError;
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Delete lecture segments
  console.log('Deleting lecture segments...');
  const { error: segmentsError } = await supabase
    .from('lecture_segments')
    .delete()
    .eq('lecture_id', lectureId);

  if (segmentsError) {
    console.error('Error deleting lecture segments:', segmentsError);
    throw segmentsError;
  }

  await new Promise(resolve => setTimeout(resolve, 500));
};

export const recreateLecture = async (
  oldLectureId: number, 
  aiConfig: { 
    temperature: number;
    creativity_level: number;
    detail_level: number;
    content_language?: string | null;
    custom_instructions?: string | null;
  }
) => {
  console.log('Starting lecture recreation process...');
  
  // First, get the old lecture data
  const { data: oldLecture, error: fetchError } = await supabase
    .from('lectures')
    .select('course_id, title, content, pdf_path, original_language')
    .eq('id', oldLectureId)
    .single();

  if (fetchError) {
    console.error('Error fetching old lecture:', fetchError);
    throw fetchError;
  }

  console.log('Retrieved old lecture data:', oldLecture);

  try {
    // Create new lecture
    const { data: newLecture, error: insertError } = await supabase
      .from('lectures')
      .insert({
        course_id: oldLecture.course_id,
        title: oldLecture.title,
        content: oldLecture.content,
        pdf_path: oldLecture.pdf_path,
        original_language: oldLecture.original_language
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating new lecture:', insertError);
      throw insertError;
    }

    console.log('Created new lecture:', newLecture);

    // Create AI config for the new lecture
    const { error: configError } = await supabase
      .from('lecture_ai_configs')
      .insert({
        lecture_id: newLecture.id,
        temperature: aiConfig.temperature,
        creativity_level: aiConfig.creativity_level,
        detail_level: aiConfig.detail_level,
        content_language: aiConfig.content_language,
        custom_instructions: aiConfig.custom_instructions
      });

    if (configError) {
      console.error('Error creating AI config:', configError);
      // If AI config creation fails, delete the new lecture to maintain consistency
      await supabase.from('lectures').delete().eq('id', newLecture.id);
      throw configError;
    }

    console.log('Created AI config for new lecture');

    // Generate segment structure for the new lecture
    console.log('Generating segments structure...');
    const { error: structureError } = await supabase.functions.invoke('generate-segments-structure', {
      body: {
        lectureId: newLecture.id,
        lectureContent: oldLecture.content,
        lectureTitle: oldLecture.title
      }
    });

    if (structureError) {
      // If structure generation fails, clean up by deleting the new lecture
      await supabase.from('lectures').delete().eq('id', newLecture.id);
      throw structureError;
    }

    console.log('Generated segments structure successfully');

    // Only delete the old lecture after everything else succeeds
    console.log('Deleting old lecture...');
    const { error: deleteError } = await supabase
      .from('lectures')
      .delete()
      .eq('id', oldLectureId);

    if (deleteError) {
      console.error('Error deleting old lecture:', deleteError);
      throw deleteError;
    }

    console.log('Old lecture deleted successfully');
    return newLecture.id;

  } catch (error) {
    console.error('Error in recreateLecture:', error);
    throw error;
  }
};
