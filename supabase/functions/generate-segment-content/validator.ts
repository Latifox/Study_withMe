
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
