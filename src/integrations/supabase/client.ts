
// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';


const SUPABASE_URL = "https://rvarixstojstceiuezsp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YXJpeHN0b2pzdGNlaXVlenNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU0MjgzNjEsImV4cCI6MjA2MTAwNDM2MX0.ELXVJiUXLLP5UfUcLZprkFqpPsHta1a5oI1Zt3tOLs8";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// Helper function to check if a storage bucket exists and create it if it doesn't
export const ensureBucketExists = async (bucketName: string) => {
  try {
    // Try to get the bucket first
    const { data: bucket, error } = await supabase.storage.getBucket(bucketName);
    
    if (error) {
      console.log(`Bucket ${bucketName} doesn't exist, creating it...`);
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB limit for podcast files
      });
      
      if (createError) {
        console.error(`Error creating ${bucketName} bucket:`, createError);
        return false;
      }
      console.log(`Successfully created ${bucketName} bucket`);
      return true;
    }
    
    console.log(`Bucket ${bucketName} already exists`);
    return true;
  } catch (error) {
    console.error('Error checking/creating bucket:', error);
    return false;
  }
};
