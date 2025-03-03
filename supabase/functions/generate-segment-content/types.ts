
export interface SegmentContentRequest {
  lectureId: number;
  segmentNumber: number;
  segmentTitle: string;
  segmentDescription: string;
  lectureContent: string;
  isProfessorLecture: boolean;
  contentLanguage?: string;
}

export interface AIConfig {
  temperature: number;
  creativity_level: number;
  detail_level: number;
  content_language: string;
  custom_instructions: string;
}
