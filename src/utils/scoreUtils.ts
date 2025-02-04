export const POINTS_PER_CORRECT_ANSWER = 5;
export const TOTAL_QUESTIONS_PER_SEGMENT = 2;
export const MAX_SCORE = POINTS_PER_CORRECT_ANSWER * TOTAL_QUESTIONS_PER_SEGMENT;

export const calculateNewScore = (currentScore: number, quizAlreadyCompleted: boolean): number => {
  if (quizAlreadyCompleted) return currentScore;
  const newScore = currentScore + POINTS_PER_CORRECT_ANSWER;
  return Math.min(newScore, MAX_SCORE); // Ensure score never exceeds MAX_SCORE
};