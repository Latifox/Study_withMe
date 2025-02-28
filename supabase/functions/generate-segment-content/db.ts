
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.2';
import type { SegmentContent } from './types.ts';

export async function saveSegmentContent(lectureId: number, segmentNumber: number, content: Partial<SegmentContent>) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
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
      })
      .select();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving segment content to database:', error);
    throw error;
  }
}

// Add the missing function
export async function saveFunctionExecutionData(
  lectureId: number, 
  segmentNumber: number, 
  executionTime: number, 
  success: boolean, 
  message: string
) {
  try {
    // This function can be used to log execution data for analytics/debugging
    console.log(`Execution data for lecture ${lectureId}, segment ${segmentNumber}:`);
    console.log(`- Execution time: ${executionTime}ms`);
    console.log(`- Success: ${success}`);
    console.log(`- Message: ${message}`);
    
    // You can uncomment this to actually store the execution data in a table if desired
    /*
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase
      .from('segment_function_executions')  // You would need to create this table
      .insert({
        lecture_id: lectureId,
        segment_number: segmentNumber,
        execution_time_ms: executionTime,
        success: success,
        message: message,
        executed_at: new Date()
      });

    if (error) {
      console.error('Error saving execution data:', error);
    }
    */
    
    // Just returning true for now since we're just logging
    return true;
  } catch (error) {
    console.error('Error in saveFunctionExecutionData:', error);
    // Don't throw the error - we don't want this auxiliary function to break
    // the main functionality if it fails
    return false;
  }
}
