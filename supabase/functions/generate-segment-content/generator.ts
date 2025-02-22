
import { ChatCompletionRequestMessage } from "https://deno.land/x/openai@v4.20.1/resources/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

interface SegmentInfo {
  title: string;
  description: string;
  lectureContent: string;
}

export interface GeneratedContent {
  theory_slide_1: string;
  theory_slide_2: string;
  quiz_1_type: "multiple_choice" | "true_false";
  quiz_1_question: string;
  quiz_1_options?: string[];
  quiz_1_correct_answer: string | boolean;
  quiz_1_explanation: string;
  quiz_2_type: "multiple_choice" | "true_false";
  quiz_2_question: string;
  quiz_2_correct_answer: string | boolean;
  quiz_2_explanation: string;
}

export class ContentGenerator {
  private async callOpenAI(messages: ChatCompletionRequestMessage[]) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate content');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async generateTheorySlides(segmentInfo: SegmentInfo): Promise<{ slide1: string; slide2: string }> {
    const prompt = {
      role: "system",
      content: `You are an expert educational content creator. Your task is to create two theory slides based on a lecture segment.
The content must be strictly based on the provided lecture content - do not add external information.
Format the content using markdown, including headers (## for main sections, ### for subsections).
Each slide should be focused and concise, building upon each other:
- Slide 1 should introduce core concepts and fundamental ideas
- Slide 2 should expand on these concepts with more detail and practical implications
Use bullet points for clarity where appropriate.
Ensure all content directly relates to the segment title and description provided.`
    };

    const userPrompt = {
      role: "user",
      content: `Create two theory slides for a segment with the following details:
Title: ${segmentInfo.title}
Description: ${segmentInfo.description}
Using only this lecture content:
${segmentInfo.lectureContent}

Return the slides in a JSON format with keys "slide1" and "slide2".`
    };

    const slidesContent = await this.callOpenAI([prompt, userPrompt]);
    return JSON.parse(slidesContent);
  }

  async generateQuizzes(segmentInfo: SegmentInfo): Promise<{
    quiz1: {
      type: "multiple_choice";
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    };
    quiz2: {
      type: "true_false";
      question: string;
      correctAnswer: boolean;
      explanation: string;
    };
  }> {
    const prompt = {
      role: "system",
      content: `You are an expert quiz creator for educational content. Your task is to create two quizzes based on a lecture segment:
1. First quiz should be multiple choice with 4 options
2. Second quiz should be true/false
The questions must be strictly based on the provided lecture content - do not add external information.
Ensure questions test understanding rather than mere recall.
Make sure the correct answers and explanations are clearly justified by the lecture content.`
    };

    const userPrompt = {
      role: "user",
      content: `Create two quizzes for a segment with the following details:
Title: ${segmentInfo.title}
Description: ${segmentInfo.description}
Using only this lecture content:
${segmentInfo.lectureContent}

Return the quizzes in a JSON format with this structure:
{
  "quiz1": {
    "type": "multiple_choice",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "...",
    "explanation": "..."
  },
  "quiz2": {
    "type": "true_false",
    "question": "...",
    "correctAnswer": true/false,
    "explanation": "..."
  }
}`
    };

    const quizzesContent = await this.callOpenAI([prompt, userPrompt]);
    return JSON.parse(quizzesContent);
  }

  async generateContent(segmentInfo: SegmentInfo): Promise<GeneratedContent> {
    console.log('Generating content for segment:', segmentInfo.title);
    
    const [slides, quizzes] = await Promise.all([
      this.generateTheorySlides(segmentInfo),
      this.generateQuizzes(segmentInfo)
    ]);

    console.log('Content generated successfully');

    return {
      theory_slide_1: slides.slide1,
      theory_slide_2: slides.slide2,
      quiz_1_type: "multiple_choice",
      quiz_1_question: quizzes.quiz1.question,
      quiz_1_options: quizzes.quiz1.options,
      quiz_1_correct_answer: quizzes.quiz1.correctAnswer,
      quiz_1_explanation: quizzes.quiz1.explanation,
      quiz_2_type: "true_false",
      quiz_2_question: quizzes.quiz2.question,
      quiz_2_correct_answer: quizzes.quiz2.correctAnswer,
      quiz_2_explanation: quizzes.quiz2.explanation,
    };
  }
}
