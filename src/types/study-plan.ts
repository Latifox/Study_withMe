
export interface LearningStep {
  step: number;
  title: string;
  description: string;
  action: string;
  timeEstimate: string;
  benefits: string[];
}

export interface StudyPlan {
  id: number;
  lecture_id: number;
  title: string;
  key_topics: string[];
  learning_steps: LearningStep[];
  is_generated: boolean;
  created_at?: string;
  updated_at?: string;
}
