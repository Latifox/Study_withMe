
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest } from "./validator.ts";
import { saveSegmentContent } from "./db.ts";

console.log("Edge function for generating segment content is running!");

async function generateSegmentContent({ segmentTitle, segmentDescription, lectureContent, contentLanguage = 'english' }) {
  console.log('Starting segment content generation for:', segmentTitle);
  console.log('Content language:', contentLanguage);
  
  // Get OpenAI API key from environment variable
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  
  try {
    // Generate theory content
    console.log('Generating theory content...');
    const theoryContent = await generateTheoryContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent, contentLanguage);
    
    // Generate quiz content
    console.log('Generating quiz content...');
    const quizContent = await generateQuizContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent, contentLanguage);
    
    // Combine the results
    console.log('Content generation completed successfully');
    return {
      ...theoryContent,
      ...quizContent
    };
  } catch (error) {
    console.error('Error generating segment content:', error);
    throw error;
  }
}

async function generateTheoryContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent, contentLanguage) {
  console.log('Generating theory content for segment:', segmentTitle);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an educational content generator. Generate theory content in JSON format only. Focus on clear, concise explanations.
          
          When creating theory slides, make the content engaging and well-formatted using Markdown syntax:
          - Use **bold text** for important concepts
          - Use *italics* for emphasis
          - Organize information with bulleted lists and numbered lists
          - Highlight key information using > for blockquotes
          - Structure content with clear headings (using # for titles)
          - Use examples to illustrate complex ideas
          
          The content will be rendered using React-Markdown, so ensure proper Markdown formatting.`
        },
        {
          role: 'user',
          content: `Generate theory content for a segment with title "${segmentTitle}" and description "${segmentDescription}" in ${contentLanguage} language. 
          Use this lecture content as reference: "${lectureContent.substring(0, 2000)}..."
          
          Return ONLY a JSON object with the following format:
          {
            "theory_slide_1": "First slide content explaining core concepts with proper Markdown formatting",
            "theory_slide_2": "Second slide content with examples and applications using Markdown formatting"
          }`
        }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

async function generateQuizContent(openAIApiKey, segmentTitle, segmentDescription, lectureContent, contentLanguage) {
  console.log('Generating quiz content for segment:', segmentTitle);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an educational quiz generator. Generate quiz questions in JSON format only. Focus on testing understanding of key concepts.'
        },
        {
          role: 'user',
          content: `Generate two quiz questions for a segment with title "${segmentTitle}" and description "${segmentDescription}" in ${contentLanguage} language. 
          Use this lecture content as reference: "${lectureContent.substring(0, 2000)}..."
          
          Return ONLY a JSON object with the following format:
          {
            "quiz_1_type": "multiple-choice",
            "quiz_1_question": "Question text",
            "quiz_1_options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "quiz_1_correct_answer": "Correct option text",
            "quiz_1_explanation": "Explanation for the correct answer",
            "quiz_2_type": "true-false",
            "quiz_2_question": "Question text",
            "quiz_2_correct_answer": true or false,
            "quiz_2_explanation": "Explanation for the correct answer"
          }`
        }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    // Validate and extract request parameters
    const { lectureId, segmentNumber, segmentTitle, segmentDescription, lectureContent, contentLanguage } = await validateRequest(req);
    
    console.log(`Generating content for lecture ${lectureId}, segment ${segmentNumber}: ${segmentTitle}`);
    
    // Generate content using OpenAI
    const content = await generateSegmentContent({ 
      segmentTitle, 
      segmentDescription, 
      lectureContent,
      contentLanguage
    });
    
    console.log(`Content generation successful for lecture ${lectureId}, segment ${segmentNumber}`);
    
    // Store in database
    const savedContent = await saveSegmentContent({
      lectureId, 
      segmentNumber, 
      content
    });
    
    return new Response(JSON.stringify({
      id: savedContent.id,
      content
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in segment content generation:', error.message);
    
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
