
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.2';

export async function saveSegmentContent(lectureId: number, segmentNumber: number, content: any) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('lecture_segments')
      .update({
        content,
        is_generated: true,
        updated_at: new Date().toISOString()
      })
      .match({ lecture_id: lectureId, sequence_number: segmentNumber });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error saving segment content to database:', error);
    throw error;
  }
}
