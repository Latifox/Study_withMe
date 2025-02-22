
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

