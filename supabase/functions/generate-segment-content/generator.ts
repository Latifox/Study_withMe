
import { SegmentContent } from "./types.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

export async function generateSegmentContent(
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  contentLanguage: string = "english"
): Promise<SegmentContent> {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OpenAI API key");
  }

  try {
    console.log(`Generating content for segment: ${segmentTitle}`);
    console.log(`Using content language: ${contentLanguage}`);

    // Check if the content is too long and trim if necessary
    const MAX_CONTENT_LENGTH = 15000;
    const trimmedContent = lectureContent.length > MAX_CONTENT_LENGTH
      ? lectureContent.substring(0, MAX_CONTENT_LENGTH)
      : lectureContent;

    const prompt = `
You are tasked with creating educational content for a segment titled "${segmentTitle}" with the description: "${segmentDescription}".
The content must be in ${contentLanguage}.

Using the following lecture content as a reference:
---
${trimmedContent}
---

Create the following items:

1. Two theory slides (theory_slide_1 and theory_slide_2) that explain the key concepts in this segment.
   Each slide should be formatted with Markdown, between 150-250 words. Use headings, bullet points, and emphasis.

2. Two quiz questions to test understanding:
   - Quiz 1: A multiple-choice question with 3-4 options
   - Quiz 2: A true/false question

For each quiz, provide:
- The question itself
- The correct answer
- An explanation of why that answer is correct

Response format:
{
  "theory_slide_1": "Markdown content for slide 1",
  "theory_slide_2": "Markdown content for slide 2",
  "quiz_1_type": "multiple_choice",
  "quiz_1_question": "Question text",
  "quiz_1_options": ["Option A", "Option B", "Option C", "Option D"],
  "quiz_1_correct_answer": "The correct option (exact text from options)",
  "quiz_1_explanation": "Explanation of the correct answer",
  "quiz_2_type": "true_false",
  "quiz_2_question": "True/false question text",
  "quiz_2_correct_answer": true or false (boolean),
  "quiz_2_explanation": "Explanation of why the statement is true or false"
}

Ensure the content is accurate, educational, and engaging.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an educational content creator specializing in creating comprehensive learning materials."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("OpenAI API error:", errorData);
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    console.log("Successfully generated segment content");
    return content;
  } catch (error) {
    console.error("Error generating segment content:", error);
    throw new Error(`Failed to generate segment content: ${error.message}`);
  }
}
