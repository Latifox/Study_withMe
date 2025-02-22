
import { Database } from '../../../src/integrations/supabase/types';

type PublicSchema = Database['public'];
type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];

interface SegmentInfo {
  title: string;
  segment_description: string;
}

interface AIConfig {
  temperature: number;
  creativity_level: number;
  detail_level: number;
  custom_instructions: string | null;
  content_language: string | null;
}

interface SegmentContent {
  theory_slide_1: string;
  theory_slide_2: string;
  quiz_1_type: 'multiple_choice' | 'true_false';
  quiz_1_question: string;
  quiz_1_options: string[] | null;
  quiz_1_correct_answer: string;
  quiz_1_explanation: string;
  quiz_2_type: 'multiple_choice' | 'true_false';
  quiz_2_question: string;
  quiz_2_correct_answer: boolean;
  quiz_2_explanation: string;
}

export async function generateSegmentContent(
  openAIApiKey: string,
  segment: SegmentInfo,
  aiConfig: AIConfig,
  content: string
): Promise<SegmentContent> {
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
          content: `You are an expert educator who creates focused, engaging learning content. For this segment titled "${segment.title}", create two concise theory slides and two quiz questions.

THEORY SLIDES RULES:
- Each slide should be focused and not exceed 250 words
- Use Markdown formatting
- Include a clear heading for each slide
- Use bullet points for better readability
- Focus on core concepts, avoid tangential information
- Include only essential examples if needed
- Write in ${aiConfig.content_language || 'English'}

QUIZ RULES:
1. First Quiz: Multiple choice
- Question should test understanding of main concepts
- Provide 4 distinct options
- Include clear explanation for correct answer

2. Second Quiz: True/False
- Focus on application of knowledge
- Include explanation that reinforces key concepts

${aiConfig.custom_instructions ? `Additional Instructions: ${aiConfig.custom_instructions}` : ''}`
        },
        {
          role: 'user',
          content: `Segment Description: ${segment.segment_description}\n\nLecture Content: ${content}`
        }
      ],
      temperature: aiConfig.temperature,
    }),
  });

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid response from OpenAI');
  }

  const rawContent = data.choices[0].message.content;
  console.log('Raw content from OpenAI:', rawContent);

  try {
    const parsedContent = JSON.parse(rawContent);

    // Validate the structure of the parsed content
    if (!parsedContent.theory_slide_1 || !parsedContent.theory_slide_2 ||
      !parsedContent.quiz_1 || !parsedContent.quiz_2) {
      throw new Error('Missing required fields in OpenAI response');
    }

    const segmentContent: SegmentContent = {
      theory_slide_1: parsedContent.theory_slide_1,
      theory_slide_2: parsedContent.theory_slide_2,
      quiz_1_type: parsedContent.quiz_1.type,
      quiz_1_question: parsedContent.quiz_1.question,
      quiz_1_options: parsedContent.quiz_1.options,
      quiz_1_correct_answer: parsedContent.quiz_1.correct_answer,
      quiz_1_explanation: parsedContent.quiz_1.explanation,
      quiz_2_type: parsedContent.quiz_2.type,
      quiz_2_question: parsedContent.quiz_2.question,
      quiz_2_correct_answer: parsedContent.quiz_2.correct_answer,
      quiz_2_explanation: parsedContent.quiz_2.explanation,
    };

    console.log('Segment content:', segmentContent);
    return segmentContent;

  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    console.error('Raw content that failed to parse:', rawContent);
    throw new Error(`Failed to parse OpenAI response: ${error}`);
  }
}

