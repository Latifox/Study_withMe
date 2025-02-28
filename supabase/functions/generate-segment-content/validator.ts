
interface SegmentParameters {
  lectureId: number;
  segmentNumber: number;
  segmentTitle: string;
  segmentDescription: string;
  lectureContent: string;
  contentLanguage: string;
}

export function verifyParameters(requestBody: any): SegmentParameters {
  console.log("Validating parameters...");
  
  if (!requestBody) {
    throw new Error("Missing request body");
  }

  const { 
    lectureId, 
    segmentNumber, 
    segmentTitle, 
    segmentDescription, 
    lectureContent, 
    contentLanguage 
  } = requestBody;

  // Check required parameters
  if (!lectureId || typeof lectureId !== "number") {
    throw new Error("Invalid or missing lectureId");
  }

  if (!segmentNumber || typeof segmentNumber !== "number") {
    throw new Error("Invalid or missing segmentNumber");
  }

  if (!segmentTitle || typeof segmentTitle !== "string") {
    throw new Error(`Invalid or missing segmentTitle: ${String(segmentTitle)}`);
  }

  if (!segmentDescription || typeof segmentDescription !== "string") {
    throw new Error(`Invalid or missing segmentDescription: ${String(segmentDescription)}`);
  }

  if (!lectureContent || typeof lectureContent !== "string") {
    throw new Error("Invalid or missing lectureContent");
  }

  // Use default language if not provided
  const language = contentLanguage || "english";

  console.log("Parameters validated successfully");
  
  return {
    lectureId,
    segmentNumber,
    segmentTitle,
    segmentDescription,
    lectureContent,
    contentLanguage: language,
  };
}

// Add the missing validateSegmentContent function
export function validateSegmentContent(segmentContent: any): { valid: boolean; errors: string[] } {
  console.log("Validating segment content...");
  const errors: string[] = [];
  
  // Check if content is defined
  if (!segmentContent) {
    errors.push("Segment content is undefined");
    return { valid: false, errors };
  }
  
  // Check theory slides
  if (!segmentContent.theory_slide_1 || typeof segmentContent.theory_slide_1 !== "string") {
    errors.push("Missing or invalid theory_slide_1");
  }
  
  if (!segmentContent.theory_slide_2 || typeof segmentContent.theory_slide_2 !== "string") {
    errors.push("Missing or invalid theory_slide_2");
  }
  
  // Check quiz 1
  if (!segmentContent.quiz_1_type || !["multiple_choice", "true_false"].includes(segmentContent.quiz_1_type)) {
    errors.push("Missing or invalid quiz_1_type");
  }
  
  if (!segmentContent.quiz_1_question || typeof segmentContent.quiz_1_question !== "string") {
    errors.push("Missing or invalid quiz_1_question");
  }
  
  if (segmentContent.quiz_1_type === "multiple_choice") {
    if (!Array.isArray(segmentContent.quiz_1_options) || segmentContent.quiz_1_options.length < 2) {
      errors.push("Missing or invalid quiz_1_options for multiple_choice type");
    }
    
    if (!segmentContent.quiz_1_correct_answer || typeof segmentContent.quiz_1_correct_answer !== "string") {
      errors.push("Missing or invalid quiz_1_correct_answer for multiple_choice type");
    }
  }
  
  if (!segmentContent.quiz_1_explanation || typeof segmentContent.quiz_1_explanation !== "string") {
    errors.push("Missing or invalid quiz_1_explanation");
  }
  
  // Check quiz 2
  if (!segmentContent.quiz_2_type || !["multiple_choice", "true_false"].includes(segmentContent.quiz_2_type)) {
    errors.push("Missing or invalid quiz_2_type");
  }
  
  if (!segmentContent.quiz_2_question || typeof segmentContent.quiz_2_question !== "string") {
    errors.push("Missing or invalid quiz_2_question");
  }
  
  if (segmentContent.quiz_2_type === "true_false") {
    if (typeof segmentContent.quiz_2_correct_answer !== "boolean") {
      errors.push("Invalid quiz_2_correct_answer for true_false type (should be boolean)");
    }
  } else if (segmentContent.quiz_2_type === "multiple_choice") {
    if (!Array.isArray(segmentContent.quiz_2_options) || segmentContent.quiz_2_options.length < 2) {
      errors.push("Missing or invalid quiz_2_options for multiple_choice type");
    }
    
    if (!segmentContent.quiz_2_correct_answer || typeof segmentContent.quiz_2_correct_answer !== "string") {
      errors.push("Missing or invalid quiz_2_correct_answer for multiple_choice type");
    }
  }
  
  if (!segmentContent.quiz_2_explanation || typeof segmentContent.quiz_2_explanation !== "string") {
    errors.push("Missing or invalid quiz_2_explanation");
  }
  
  console.log("Segment content validation completed with", errors.length, "errors");
  if (errors.length > 0) {
    console.error("Validation errors:", errors);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
