
/**
 * Main function to generate complete segment content
 */
export async function generateSegmentContent(
  lectureId: number,
  segmentNumber: number,
  segmentTitle: string,
  segmentDescription: string,
  lectureContent: string,
  contentLanguage: string = 'english'
): Promise<ApiResponse> {
  console.log(`Generating full content for segment ${segmentNumber}`);
  
  try {
    // Generate theory content
    const theoryContent = await generateTheoryContent(
      lectureContent,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      contentLanguage
    );
    
    // Generate quiz content
    const quizContent = await generateQuizContent(
      lectureContent,
      segmentNumber,
      segmentTitle,
      segmentDescription,
      contentLanguage
    );
    
    // Combine the content
    const segmentContent: SegmentContent = {
      theory_slide_1: theoryContent.slide1,
      theory_slide_2: theoryContent.slide2,
      quiz_1_type: quizContent.quiz1Type,
      quiz_1_question: quizContent.quiz1Question,
      quiz_1_options: quizContent.quiz1Options,
      quiz_1_correct_answer: quizContent.quiz1CorrectAnswer,
      quiz_1_explanation: quizContent.quiz1Explanation,
      quiz_2_type: quizContent.quiz2Type,
      quiz_2_question: quizContent.quiz2Question,
      quiz_2_correct_answer: quizContent.quiz2CorrectAnswer,
      quiz_2_explanation: quizContent.quiz2Explanation
    };
    
    // Validate the content
    const validationResult = validateContent(segmentContent);
    if (!validationResult.valid) {
      throw new Error(`Content validation failed: ${validationResult.errors.join(', ')}`);
    }
    
    console.log('Successfully generated and validated segment content');
    
    return {
      success: true,
      content: segmentContent
    };
  } catch (error) {
    console.error('Error in generateSegmentContent:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
