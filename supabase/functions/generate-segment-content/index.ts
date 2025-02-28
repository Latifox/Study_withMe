
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as postgres from 'https://deno.land/x/postgres@v0.14.2/mod.ts'
import { corsHeaders } from "../_shared/cors.ts"
import { generateSegmentContent } from "./generator.ts"
import { validateRequest } from "./validator.ts"
import { db } from "./db.ts"

console.log("Segment content generator function started!")

serve(async (req) => {
  // Handle CORS for browser preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Processing request...")
    
    // Parse the request payload
    let payload
    try {
      payload = await req.json()
      console.log("Request payload received:", JSON.stringify(payload))
    } catch (err) {
      console.error("Error parsing request JSON:", err.message)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Validate the request parameters
    try {
      console.log("Validating request parameters...")
      const validationResult = validateRequest(payload)
      if (!validationResult.valid) {
        console.error("Validation failed:", validationResult.error)
        return new Response(
          JSON.stringify({ error: `Invalid request: ${validationResult.error}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      console.log("Request validation successful")
    } catch (err) {
      console.error("Unexpected error during validation:", err)
      return new Response(
        JSON.stringify({ error: `Validation error: ${err.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Extract parameters from the payload
    const { 
      lectureId, 
      segmentNumber, 
      segmentTitle, 
      segmentDescription, 
      lectureContent,
      contentLanguage = 'english'  // Default to English if not specified
    } = payload
    
    console.log(`Processing segment ${segmentNumber} (${segmentTitle}) for lecture ${lectureId}`)
    console.log(`Content language: ${contentLanguage}`)
    console.log(`Segment description length: ${segmentDescription ? segmentDescription.length : 0}`)
    console.log(`Lecture content length: ${lectureContent ? lectureContent.length : 0}`)

    // Initialize database connection
    try {
      console.log("Initializing database connection...")
      await db.connect()
      console.log("Database connection established")
    } catch (err) {
      console.error("Database connection error:", err)
      return new Response(
        JSON.stringify({ error: `Database connection error: ${err.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Check if content already exists
    try {
      console.log("Checking for existing content...")
      const { data: existingContent } = await db.getExistingContent(lectureId, segmentNumber)
      
      if (existingContent) {
        console.log("Found existing content, returning it")
        return new Response(
          JSON.stringify({ success: true, content: existingContent, id: existingContent.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log("No existing content found, proceeding with generation")
    } catch (err) {
      console.error("Error checking existing content:", err)
      // Continue with generation if check fails
    }

    // Generate the content
    console.log("Starting content generation...")
    try {
      const content = await generateSegmentContent({
        segmentTitle,
        segmentDescription,
        lectureContent,
        contentLanguage
      })
      
      console.log("Content generated successfully")
      
      // Insert the generated content into the database
      try {
        console.log("Storing generated content in database...")
        const { data: contentRecord, error: insertError } = await db.storeContent({
          lecture_id: lectureId,
          sequence_number: segmentNumber,
          ...content
        })
        
        if (insertError) {
          console.error("Error storing content:", insertError)
          throw insertError
        }
        
        console.log("Content stored successfully with ID:", contentRecord?.id)
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            content: content,
            id: contentRecord?.id 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (storeErr) {
        console.error("Error in database storage:", storeErr)
        throw storeErr
      }
    } catch (genErr) {
      console.error("Content generation error:", genErr)
      return new Response(
        JSON.stringify({ error: `Content generation failed: ${genErr.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    } finally {
      // Close database connection
      try {
        await db.end()
        console.log("Database connection closed")
      } catch (err) {
        console.error("Error closing database connection:", err)
      }
    }
  } catch (err) {
    console.error("Unhandled error in edge function:", err)
    return new Response(
      JSON.stringify({ error: `Server error: ${err.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
