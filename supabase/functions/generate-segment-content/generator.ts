
import { SegmentContent } from "./types.ts";

// OpenAI API setup
const apiKey = Deno.env.get("OPENAI_API_KEY") || "";
const apiUrl = "https://api.openai.com/v1/chat/completions";

// Safely format the lecture content to avoid issues with huge content
function prepareLectureContent(content: string): string {
  const maxContentLength = 20000; // Limit the content length to avoid exceeding token limits
  if (content.length > maxContentLength) {
    console.log(`Content is too long (${content.length} chars), truncating to ${maxContentLength} chars`);
    return content.substring(0, maxContentLength) + "...";
  }
  return content;
}

export async function generateSegmentContent(
  segmentTitle: string,
  segmentDescription: string | undefined,
  lectureContent: string,
  contentLanguage: string = "english"
): Promise<SegmentContent> {
  console.log(`Generating content for segment: ${segmentTitle}`);
  console.log(`Content language: ${contentLanguage}`);
  
  // Prepare lecture content
  const preparedContent = prepareLectureContent(lectureContent);
  
  try {
    // Create system message that properly escapes special characters
    const systemMessage = `You are an AI teaching assistant that creates educational content. 
Create engaging material based on the lecture segment title and description.
Your output must be in ${contentLanguage}.
Generate content in JSON format with the following structure:
{
  "theory_slide_1": "First slide explaining the concept clearly",
  "theory_slide_2": "Second slide going deeper into the concept with examples",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "A question testing understanding of the concept",
  "quiz_1_options": ["Option A", "Option B", "Option C", "Option D"],
  "quiz_1_correct_answer": "The correct option (exactly as written in the options)",
  "quiz_1_explanation": "Explanation of why the answer is correct",
  "quiz_2_type": "free_text",
  "quiz_2_question": "A more challenging question requiring written response",
  "quiz_2_correct_answer": "The expected answer or key points to include",
  "quiz_2_explanation": "Detailed explanation of the correct answer"
}

Format guidelines:
- Escape special markdown characters (e.g., '\\#', '\\*', '\\-', etc.) with backslashes
- Keep theory slides concise but informative
- Make multiple-choice options clear and distinct
- Ensure the correct_answer EXACTLY matches one of the options
- For free_text questions, provide key points for the expected answer`;

    // Prepare the messages for the OpenAI API
    const messages = [
      { role: "system", content: systemMessage },
      { 
        role: "user", 
        content: `Create educational content for the following lecture segment:
Title: ${segmentTitle}
${segmentDescription ? `Description: ${segmentDescription}` : ''}

Here's the relevant lecture content to base your material on:
${preparedContent}

Please generate the content according to the specified JSON format.`
      }
    ];

    // Make the API request with proper error handling
    console.log("Sending request to OpenAI...");
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    // Check for HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error (${response.status}):`, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    // Parse the response
    const data = await response.json();
    if (!data.choices || data.choices.length === 0) {
      console.error("Invalid response from OpenAI:", data);
      throw new Error("Invalid response from OpenAI API");
    }

    const content = data.choices[0].message.content;
    console.log("Received content from OpenAI, parsing JSON...");

    try {
      // Extract and parse the JSON from the response
      let parsedContent;
      
      // Handle case where the AI might wrap the JSON in backticks
      const jsonRegex = /```json\n([\s\S]*?)\n```|```([\s\S]*?)```|(\{[\s\S]*\})/;
      const match = content.match(jsonRegex);
      
      if (match) {
        const jsonContent = match[1] || match[2] || match[3];
        parsedContent = JSON.parse(jsonContent);
      } else {
        // Try to parse directly if not wrapped
        parsedContent = JSON.parse(content);
      }

      // Validate that the response has the required fields
      const requiredFields = [
        "theory_slide_1",
        "theory_slide_2",
        "quiz_1_type",
        "quiz_1_question",
        "quiz_1_correct_answer",
        "quiz_1_explanation",
        "quiz_2_type",
        "quiz_2_question",
        "quiz_2_correct_answer",
        "quiz_2_explanation"
      ];

      for (const field of requiredFields) {
        if (!parsedContent[field]) {
          console.error(`Missing required field in OpenAI response: ${field}`);
          throw new Error(`Missing required field in content: ${field}`);
        }
      }

      // Ensure quiz_1_options exists if quiz_1_type is multiple_choice
      if (parsedContent.quiz_1_type === "multiple_choice" && !parsedContent.quiz_1_options) {
        console.error("Missing quiz_1_options for multiple_choice quiz");
        throw new Error("Missing quiz_1_options for multiple_choice quiz");
      }

      console.log("Successfully parsed and validated content");
      return parsedContent;
    } catch (parseError) {
      console.error("Failed to parse content from OpenAI:", parseError);
      console.error("Raw content:", content);
      throw new Error(`Failed to parse content: ${parseError.message}`);
    }
  } catch (error) {
    console.error("Error generating segment content:", error);
    throw error;
  }
}
