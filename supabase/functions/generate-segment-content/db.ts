
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { SegmentContentRequest } from "./types.ts";

// Initialize Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

export async function updateSegmentContent(
  request: SegmentContentRequest,
  content: string
) {
  const supabase = getSupabaseClient();
  const { lectureId, segmentNumber, isProfessorLecture } = request;
  
  console.log(`Updating ${isProfessorLecture ? 'professor' : 'regular'} segment content`);
  console.log(`Lecture ID: ${lectureId}, Segment Number: ${segmentNumber}`);
  
  try {
    // Choose the appropriate table based on the lecture type
    const tableName = isProfessorLecture ? 'professor_segments_content' : 'segments_content';
    
    // First check if content already exists
    const { data: existingContent, error: fetchError } = await supabase
      .from(tableName)
      .select('id')
      .eq('lecture_id', lectureId)
      .eq('segment_number', segmentNumber)
      .maybeSingle();
      
    if (fetchError) {
      console.error('Error checking existing content:', fetchError);
      return { error: fetchError.message };
    }
    
    if (existingContent) {
      // Update existing content
      console.log('Updating existing segment content');
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', existingContent.id);
        
      if (updateError) {
        console.error('Error updating content:', updateError);
        return { error: updateError.message };
      }
    } else {
      // Insert new content
      console.log('Creating new segment content');
      const { error: insertError } = await supabase
        .from(tableName)
        .insert({
          lecture_id: lectureId,
          segment_number: segmentNumber,
          content
        });
        
      if (insertError) {
        console.error('Error inserting content:', insertError);
        return { error: insertError.message };
      }
    }
    
    return { error: null };
  } catch (error) {
    console.error('Unexpected error in updateSegmentContent:', error);
    return { error: error.message };
  }
}

export async function getAIConfig(lectureId: number) {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('lecture_ai_configs')
      .select('*')
      .eq('lecture_id', lectureId)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching AI config:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Unexpected error in getAIConfig:', error);
    return null;
  }
}
