
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
};

export const recreateLecture = async (
  oldLectureId: number, 
  aiConfig: { 
    temperature: number;
    creativity_level: number;
    detail_level: number;
    content_language?: string | null;
    custom_instructions?: string | null;
    isProfessorLecture?: boolean;
  }
) => {
  console.log('Starting lecture recreation process...');
  const isProfessorLecture = aiConfig.isProfessorLecture || false;
  
  // Get the table name based on the lecture type
  const tableName = isProfessorLecture ? 'professor_lectures' : 'lectures';
  const courseIdField = isProfessorLecture ? 'professor_course_id' : 'course_id';
  
  // First, get the old lecture data
  const { data, error: fetchError } = await supabase
    .from(tableName)
    .select(`${courseIdField}, title, content, pdf_path, original_language`)
    .eq('id', oldLectureId)
    .single();

  if (fetchError) {
    console.error(`Error fetching old ${isProfessorLecture ? 'professor' : ''} lecture:`, fetchError);
    throw fetchError;
  }

  if (!data) {
    throw new Error(`No lecture found with ID: ${oldLectureId}`);
  }

  // Type assertion with proper conversion to unknown first
  const oldLecture = (data as unknown) as {
    [key: string]: any;
    title: string;
    content: string;
    pdf_path: string | null;
    original_language: string | null;
  };
  
  console.log('Retrieved old lecture data:', oldLecture);

  try {
    // Create new lecture
    const insertData = {
      [courseIdField]: oldLecture[courseIdField],
      title: oldLecture.title,
      content: oldLecture.content,
      pdf_path: oldLecture.pdf_path,
      original_language: oldLecture.original_language
    };

    const { data: newLectureData, error: insertError } = await supabase
      .from(tableName)
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error(`Error creating new ${isProfessorLecture ? 'professor' : ''} lecture:`, insertError);
      throw insertError;
    }

    if (!newLectureData) {
      throw new Error('Failed to create new lecture');
    }

    // Type assertion for newLecture with proper conversion to unknown first
    const newLecture = (newLectureData as unknown) as {
      id: number;
      [key: string]: any;
    };
    
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
      await supabase.from(tableName).delete().eq('id', newLecture.id);
      throw configError;
    }

    console.log('Created AI config for new lecture');

    // Generate segment structure for the new lecture
    console.log('Generating segments structure...');
    const { data: structureResult, error: structureError } = await supabase.functions.invoke('generate-segments-structure', {
      body: {
        lectureId: newLecture.id,
        lectureContent: oldLecture.content,
        lectureTitle: oldLecture.title,
        isProfessorLecture: isProfessorLecture
      }
    });

    if (structureError) {
      // If structure generation fails, clean up by deleting the new lecture
      await supabase.from(tableName).delete().eq('id', newLecture.id);
      throw structureError;
    }

    console.log('Generated segments structure successfully');

    // Get all segments for the new lecture
    const { data: segmentsData, error: segmentsError } = await supabase
      .from('lecture_segments')
      .select('sequence_number, title, segment_description')
      .eq('lecture_id', newLecture.id)
      .order('sequence_number');

    if (segmentsError) {
      console.error('Error fetching segments:', segmentsError);
      throw segmentsError;
    }

    const segments = segmentsData || [];

    // Generate content for each segment
    console.log('Generating content for segments...');
    for (const segment of segments) {
      console.log(`Generating content for segment ${segment.sequence_number}...`);
      const { error: contentError } = await supabase.functions.invoke('generate-segment-content', {
        body: {
          lectureId: newLecture.id,
          segmentNumber: segment.sequence_number,
          segmentTitle: segment.title,
          segmentDescription: segment.segment_description,
          lectureContent: oldLecture.content,
          isProfessorLecture: isProfessorLecture
        }
      });

      if (contentError) {
        console.error(`Error generating content for segment ${segment.sequence_number}:`, contentError);
        // Continue with other segments even if one fails
        continue;
      }
    }

    console.log('Segment content generation completed');

    // Only delete the old lecture after everything else succeeds
    console.log('Deleting old lecture...');
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', oldLectureId);

    if (deleteError) {
      console.error(`Error deleting old ${isProfessorLecture ? 'professor' : ''} lecture:`, deleteError);
      throw deleteError;
    }

    console.log('Old lecture deleted successfully');
    return newLecture.id;

  } catch (error) {
    console.error('Error in recreateLecture:', error);
    throw error;
  }
};
