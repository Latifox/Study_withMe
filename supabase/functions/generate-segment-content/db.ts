
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.34.0'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

export const db = {
  client: null as any,
  
  connect: async function() {
    console.log("DB: Initializing Supabase client");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("DB: Missing environment variables for Supabase connection");
      throw new Error("Missing Supabase connection parameters");
    }
    
    // Test connection by making a simple query
    try {
      const { data, error } = await supabaseClient.from('segments_content').select('id').limit(1);
      if (error) throw error;
      console.log("DB: Supabase connection test successful");
    } catch (err) {
      console.error("DB: Supabase connection test failed:", err);
      throw new Error(`Failed to connect to Supabase: ${err.message}`);
    }
    
    this.client = supabaseClient;
    return this.client;
  },
  
  getExistingContent: async function(lectureId: number, segmentNumber: number) {
    console.log(`DB: Checking for existing content for lecture ${lectureId}, segment ${segmentNumber}`);
    
    try {
      const { data, error } = await this.client
        .from('segments_content')
        .select('*')
        .eq('lecture_id', lectureId)
        .eq('sequence_number', segmentNumber)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is not an error for us
        console.error("DB: Error fetching existing content:", error);
        throw error;
      }
      
      if (data) {
        console.log(`DB: Found existing content with ID ${data.id}`);
      } else {
        console.log("DB: No existing content found");
      }
      
      return { data, error: null };
    } catch (err) {
      console.error("DB: Unexpected error in getExistingContent:", err);
      return { data: null, error: err };
    }
  },
  
  storeContent: async function(content: any) {
    console.log(`DB: Storing content for lecture ${content.lecture_id}, segment ${content.sequence_number}`);
    
    try {
      // Log content structure without the actual content
      const contentKeys = Object.keys(content);
      console.log(`DB: Content object has ${contentKeys.length} keys: ${contentKeys.join(', ')}`);
      
      const { data, error } = await this.client
        .from('segments_content')
        .upsert(content)
        .select()
        .single();
      
      if (error) {
        console.error("DB: Error storing content:", error);
        throw error;
      }
      
      console.log(`DB: Content stored successfully with ID ${data?.id}`);
      return { data, error: null };
    } catch (err) {
      console.error("DB: Unexpected error in storeContent:", err);
      return { data: null, error: err };
    }
  },
  
  end: async function() {
    console.log("DB: Closing connection");
    // No explicit close needed for Supabase client
    this.client = null;
    return true;
  }
};
