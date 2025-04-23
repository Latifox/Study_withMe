-- Add RLS policies for all tables

-- Courses table policies
CREATE POLICY "Users can view their own courses"
ON public.courses
FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own courses"
ON public.courses
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own courses"
ON public.courses
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own courses"
ON public.courses
FOR DELETE
USING (owner_id = auth.uid());

-- Lectures table policies
CREATE POLICY "Users can view lectures in their courses"
ON public.lectures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lectures.course_id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert lectures to their courses"
ON public.lectures
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lectures.course_id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update lectures in their courses"
ON public.lectures
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lectures.course_id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete lectures in their courses"
ON public.lectures
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = lectures.course_id
    AND courses.owner_id = auth.uid()
  )
);

-- Flashcards table policies
CREATE POLICY "Users can view flashcards for their lectures"
ON public.flashcards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE flashcards.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert flashcards for their lectures"
ON public.flashcards
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE flashcards.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update flashcards for their lectures"
ON public.flashcards
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE flashcards.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete flashcards for their lectures"
ON public.flashcards
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE flashcards.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Generated quizzes policies
CREATE POLICY "Users can view their own generated quizzes"
ON public.generated_quizzes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own generated quizzes"
ON public.generated_quizzes
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own generated quizzes"
ON public.generated_quizzes
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own generated quizzes"
ON public.generated_quizzes
FOR DELETE
USING (user_id = auth.uid());

-- Lecture additional resources policies
CREATE POLICY "Users can view additional resources for their lectures"
ON public.lecture_additional_resources
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_additional_resources.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert additional resources for their lectures"
ON public.lecture_additional_resources
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_additional_resources.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update additional resources for their lectures"
ON public.lecture_additional_resources
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_additional_resources.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete additional resources for their lectures"
ON public.lecture_additional_resources
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_additional_resources.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Lecture AI configs policies
CREATE POLICY "Users can view AI configs for their lectures"
ON public.lecture_ai_configs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_ai_configs.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert AI configs for their lectures"
ON public.lecture_ai_configs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_ai_configs.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update AI configs for their lectures"
ON public.lecture_ai_configs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_ai_configs.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete AI configs for their lectures"
ON public.lecture_ai_configs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_ai_configs.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Lecture highlights policies
CREATE POLICY "Users can view highlights for their lectures"
ON public.lecture_highlights
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_highlights.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert highlights for their lectures"
ON public.lecture_highlights
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_highlights.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update highlights for their lectures"
ON public.lecture_highlights
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_highlights.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete highlights for their lectures"
ON public.lecture_highlights
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_highlights.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Similar policies for other tables
-- Lecture podcast policies
CREATE POLICY "Users can view podcast for their lectures"
ON public.lecture_podcast
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_podcast.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert podcast for their lectures"
ON public.lecture_podcast
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_podcast.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update podcast for their lectures"
ON public.lecture_podcast
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_podcast.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete podcast for their lectures"
ON public.lecture_podcast
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_podcast.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Lecture segments policies
CREATE POLICY "Users can view segments for their lectures"
ON public.lecture_segments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_segments.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert segments for their lectures"
ON public.lecture_segments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_segments.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update segments for their lectures"
ON public.lecture_segments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_segments.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete segments for their lectures"
ON public.lecture_segments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_segments.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Professor courses policies
CREATE POLICY "Professors can view their own courses"
ON public.professor_courses
FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Professors can insert their own courses"
ON public.professor_courses
FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Professors can update their own courses"
ON public.professor_courses
FOR UPDATE
USING (owner_id = auth.uid());

CREATE POLICY "Professors can delete their own courses"
ON public.professor_courses
FOR DELETE
USING (owner_id = auth.uid());

-- Professor lectures policies
CREATE POLICY "Professors can view lectures in their courses"
ON public.professor_lectures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.professor_courses
    WHERE professor_courses.id = professor_lectures.professor_course_id
    AND professor_courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Students can view enrolled course lectures" 
ON public.professor_lectures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.student_enrolled_courses
    WHERE student_enrolled_courses.course_id = professor_lectures.professor_course_id
    AND student_enrolled_courses.user_id = auth.uid()
  )
);

CREATE POLICY "Professors can insert lectures to their courses"
ON public.professor_lectures
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professor_courses
    WHERE professor_courses.id = professor_lectures.professor_course_id
    AND professor_courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Professors can update lectures in their courses"
ON public.professor_lectures
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.professor_courses
    WHERE professor_courses.id = professor_lectures.professor_course_id
    AND professor_courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Professors can delete lectures in their courses"
ON public.professor_lectures
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.professor_courses
    WHERE professor_courses.id = professor_lectures.professor_course_id
    AND professor_courses.owner_id = auth.uid()
  )
);

-- Student enrolled courses policies
CREATE POLICY "Students can view their enrolled courses"
ON public.student_enrolled_courses
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Students can enroll in courses"
ON public.student_enrolled_courses
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update their enrolled courses"
ON public.student_enrolled_courses
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Students can unenroll from courses"
ON public.student_enrolled_courses
FOR DELETE
USING (user_id = auth.uid());

-- Quiz progress policies
CREATE POLICY "Users can view their own quiz progress"
ON public.quiz_progress
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own quiz progress"
ON public.quiz_progress
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own quiz progress"
ON public.quiz_progress
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own quiz progress"
ON public.quiz_progress
FOR DELETE
USING (user_id = auth.uid());

-- User progress policies
CREATE POLICY "Users can view their own progress"
ON public.user_progress
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own progress"
ON public.user_progress
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress"
ON public.user_progress
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own progress"
ON public.user_progress
FOR DELETE
USING (user_id = auth.uid());

-- Study plans policies
CREATE POLICY "Users can view study plans for their lectures"
ON public.study_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE study_plans.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert study plans for their lectures"
ON public.study_plans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE study_plans.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update study plans for their lectures"
ON public.study_plans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE study_plans.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete study plans for their lectures"
ON public.study_plans
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE study_plans.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
); 