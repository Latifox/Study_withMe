import React, { Suspense, useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { siteConfig } from './config/site';
import { Shell } from './components/shell';
import { Home } from './pages/Home';
import { Docs } from './pages/Docs';
import { Pricing } from './pages/Pricing';
import { Contact } from './pages/Contact';
import { About } from './pages/About';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Auth } from './pages/Auth';
import { Course } from './pages/Course';
import { Lecture } from './pages/Lecture';
import { Highlights } from './pages/Highlights';
import { Story } from './pages/Story';
import { Chat } from './pages/Chat';
import { Flashcards } from './pages/Flashcards';
import { Quiz } from './pages/Quiz';
import { Mindmap } from './pages/Mindmap';
import { Resources } from './pages/Resources';
import { Settings } from './pages/Settings';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { useSession } from './hooks/useSession';
import { Loader2 } from 'lucide-react';
import { StudyPlan } from './pages/StudyPlan';
import { CourseUpload } from './pages/CourseUpload';
import { CourseEdit } from './pages/CourseEdit';
import { LectureEdit } from './pages/LectureEdit';
import { LectureUpload } from './pages/LectureUpload';
import { ProfessorCourses } from './pages/ProfessorCourses';
import { ProfessorCourse } from './pages/ProfessorCourse';
import { ProfessorLecture } from './pages/ProfessorLecture';
import { ProfessorLectureUpload } from './pages/ProfessorLectureUpload';
import { ProfessorLectureEdit } from './pages/ProfessorLectureEdit';
import { ProfessorCourseUpload } from './pages/ProfessorCourseUpload';
import { ProfessorCourseEdit } from './pages/ProfessorCourseEdit';
import { TakeQuiz } from './pages/TakeQuiz';
import { GeneratedQuiz } from './pages/GeneratedQuiz';
import { Segments } from './pages/Segments';
import { SegmentEdit } from './pages/SegmentEdit';
import { SegmentUpload } from './pages/SegmentUpload';
import { ProfessorSegments } from './pages/ProfessorSegments';
import { ProfessorSegmentEdit } from './pages/ProfessorSegmentEdit';
import { ProfessorSegmentUpload } from './pages/ProfessorSegmentUpload';
import {
  ProfessorSegmentContentEdit
} from './pages/ProfessorSegmentContentEdit';
import {
  ProfessorSegmentContentUpload
} from './pages/ProfessorSegmentContentUpload';
import { SegmentContentEdit } from './pages/SegmentContentEdit';
import { SegmentContentUpload } from './pages/SegmentContentUpload';
import { useSearchParams } from 'react-router-dom';
import { CourseJoin } from './pages/CourseJoin';
import { StudentCourses } from './pages/StudentCourses';
import { StudentCourse } from './pages/StudentCourse';
import { StudentLecture } from './pages/StudentLecture';
import { StudentStudyPlan } from './pages/StudentStudyPlan';
import { StudentSegments } from './pages/StudentSegments';
import { StudentSegment } from './pages/StudentSegment';
import { StudentTakeQuiz } from './pages/StudentTakeQuiz';
import { StudentGeneratedQuiz } from './pages/StudentGeneratedQuiz';
import { StudentHighlights } from './pages/StudentHighlights';
import { StudentStory } from './pages/StudentStory';
import { StudentChat } from './pages/StudentChat';
import { StudentFlashcards } from './pages/StudentFlashcards';
import { StudentMindmap } from './pages/StudentMindmap';
import { StudentResources } from './pages/StudentResources';
import { StudentPodcast } from './pages/StudentPodcast';
import { StudentSettings } from './pages/StudentSettings';
import { ProfessorSettings } from './pages/ProfessorSettings';
import { ProfessorAuth } from './pages/ProfessorAuth';
import { ProfessorSignIn } from './pages/ProfessorSignIn';
import { ProfessorSignUp } from './pages/ProfessorSignUp';
import { ProfessorHome } from './pages/ProfessorHome';
import { ProfessorStudyPlan } from './pages/ProfessorStudyPlan';
import { ProfessorQuiz } from './pages/ProfessorQuiz';
import { ProfessorHighlights } from './pages/ProfessorHighlights';
import { ProfessorStory } from './pages/ProfessorStory';
import { ProfessorChat } from './pages/ProfessorChat';
import { ProfessorFlashcards } from './pages/ProfessorFlashcards';
import { ProfessorMindmap } from './pages/ProfessorMindmap';
import { ProfessorResources } from './pages/ProfessorResources';
import { ProfessorPodcast } from './pages/ProfessorPodcast';
import { ProfessorCourseJoin } from './pages/ProfessorCourseJoin';
import { ProfessorStudentCourses } from './pages/ProfessorStudentCourses';
import { ProfessorStudentCourse } from './pages/ProfessorStudentCourse';
import { ProfessorStudentLecture } from './pages/ProfessorStudentLecture';
import { ProfessorStudentStudyPlan } from './pages/ProfessorStudentStudyPlan';
import { ProfessorStudentSegments } from './pages/ProfessorStudentSegments';
import { ProfessorStudentSegment } from './pages/ProfessorStudentSegment';
import { ProfessorStudentTakeQuiz } from './pages/ProfessorStudentTakeQuiz';
import { ProfessorStudentGeneratedQuiz } from './pages/ProfessorStudentGeneratedQuiz';
import { ProfessorStudentHighlights } from './pages/ProfessorStudentHighlights';
import { ProfessorStudentStory } from './pages/ProfessorStudentStory';
import { ProfessorStudentChat } from './pages/ProfessorStudentChat';
import { ProfessorStudentFlashcards } from './pages/ProfessorStudentFlashcards';
import { ProfessorStudentMindmap } from './pages/ProfessorStudentMindmap';
import { ProfessorStudentResources } from './pages/ProfessorStudentResources';
import { ProfessorStudentPodcast } from './pages/ProfessorStudentPodcast';
import Podcast from "./pages/Podcast";

function App() {
  const { toast } = useToast();
  const { session, isLoading } = useSession();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Router>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/course-join" element={<CourseJoin />} />
            <Route path="/student/courses" element={<StudentCourses />} />
            <Route path="/professor/auth" element={<ProfessorAuth />} />
            <Route path="/professor/sign-in" element={<ProfessorSignIn />} />
            <Route path="/professor/sign-up" element={<ProfessorSignUp />} />
            <Route path="/professor/home" element={<ProfessorHome />} />
            <Route path="/professor/course-join" element={<ProfessorCourseJoin />} />
            <Route path="/professor/student/courses" element={<ProfessorStudentCourses />} />
            <Route path="/professor/settings" element={<ProfessorSettings />} />
            <Route path="/student/settings" element={<StudentSettings />} />
            <Route path="/professor/student/course/:courseId" element={<ProfessorStudentCourse />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId" element={<ProfessorStudentLecture />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/study-plan" element={<ProfessorStudentStudyPlan />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/segments" element={<ProfessorStudentSegments />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/segment/:segmentNumber" element={<ProfessorStudentSegment />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/take-quiz" element={<ProfessorStudentTakeQuiz />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/generated-quiz/:quizId" element={<ProfessorStudentGeneratedQuiz />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/highlights" element={<ProfessorStudentHighlights />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/story" element={<ProfessorStudentStory />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/chat" element={<ProfessorStudentChat />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/flashcards" element={<ProfessorStudentFlashcards />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/mindmap" element={<ProfessorStudentMindmap />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/resources" element={<ProfessorStudentResources />} />
            <Route path="/professor/student/course/:courseId/lecture/:lectureId/podcast" element={<ProfessorStudentPodcast />} />
            <Route path="/student/course/:courseId" element={<StudentCourse />} />
            <Route path="/student/course/:courseId/lecture/:lectureId" element={<StudentLecture />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/study-plan" element={<StudentStudyPlan />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/segments" element={<StudentSegments />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/segment/:segmentNumber" element={<StudentSegment />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/take-quiz" element={<StudentTakeQuiz />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/generated-quiz/:quizId" element={<StudentGeneratedQuiz />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/highlights" element={<StudentHighlights />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/story" element={<StudentStory />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/chat" element={<StudentChat />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/flashcards" element={<StudentFlashcards />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/mindmap" element={<StudentMindmap />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/resources" element={<StudentResources />} />
            <Route path="/student/course/:courseId/lecture/:lectureId/podcast" element={<StudentPodcast />} />
            <Route path="/course/:courseId" element={<Course />} />
            <Route path="/course/:courseId/edit" element={<CourseEdit />} />
            <Route path="/course/:courseId/lecture/:lectureId" element={<Lecture />} />
            <Route path="/course/:courseId/lecture/:lectureId/edit" element={<LectureEdit />} />
            <Route path="/course/:courseId/lecture/:lectureId/study-plan" element={<StudyPlan />} />
            <Route path="/course/:courseId/lecture/:lectureId/highlights" element={<Highlights />} />
            <Route path="/course/:courseId/lecture/:lectureId/story" element={<Story />} />
            <Route path="/course/:courseId/lecture/:lectureId/chat" element={<Chat />} />
            <Route path="/course/:courseId/lecture/:lectureId/flashcards" element={<Flashcards />} />
            <Route path="/course/:courseId/lecture/:lectureId/take-quiz" element={<TakeQuiz />} />
            <Route path="/course/:courseId/lecture/:lectureId/generated-quiz/:quizId" element={<GeneratedQuiz />} />
            <Route path="/course/:courseId/lecture/:lectureId/mindmap" element={<Mindmap />} />
            <Route path="/course/:courseId/lecture/:lectureId/resources" element={<Resources />} />
            <Route path="/course/:courseId/lecture/:lectureId/segments" element={<Segments />} />
            <Route path="/course/:courseId/lecture/:lectureId/segment/:segmentNumber" element={<SegmentEdit />} />
            <Route path="/course/:courseId/lecture/:lectureId/segment-content/:segmentNumber/edit" element={<SegmentContentEdit />} />
            <Route path="/course/:courseId/lecture/:lectureId/segment-content/upload" element={<SegmentContentUpload />} />
            <Route path="/course/:courseId/lecture/:lectureId/segment/upload" element={<SegmentUpload />} />
            <Route path="/course/upload" element={<CourseUpload />} />
            <Route path="/lecture/upload" element={<LectureUpload />} />
            <Route path="/professor/courses" element={<ProfessorCourses />} />
            <Route path="/professor/course/:courseId" element={<ProfessorCourse />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId" element={<ProfessorLecture />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/study-plan" element={<ProfessorStudyPlan />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/quiz" element={<ProfessorQuiz />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/highlights" element={<ProfessorHighlights />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/story" element={<ProfessorStory />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/chat" element={<ProfessorChat />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/flashcards" element={<ProfessorFlashcards />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/mindmap" element={<ProfessorMindmap />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/resources" element={<ProfessorResources />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/podcast" element={<ProfessorPodcast />} />
            <Route path="/professor/course/:courseId/edit" element={<ProfessorCourseEdit />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/segments" element={<ProfessorSegments />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/segment/:segmentNumber" element={<ProfessorSegmentEdit />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/segment-content/:segmentNumber/edit" element={<ProfessorSegmentContentEdit />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/segment/upload" element={<ProfessorSegmentUpload />} />
            <Route path="/professor/lecture/upload" element={<ProfessorLectureUpload />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/edit" element={<ProfessorLectureEdit />} />
            <Route path="/professor/course/upload" element={<ProfessorCourseUpload />} />
            <Route path="/professor/course/:courseId/lecture/:lectureId/segment-content/upload" element={<ProfessorSegmentContentUpload />} />
            <Route path="podcast" element={<Podcast />} />
          </Routes>
        </Shell>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;
