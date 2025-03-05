
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/AuthProvider";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import Auth from "./pages/Auth";
import AccountType from "./pages/AccountType";
import UploadedCourses from "./pages/UploadedCourses";
import ProfessorCourses from "./pages/ProfessorCourses";
import InvitedCourses from "./pages/InvitedCourses";
import Course from "./pages/Course";
import LectureChat from "./pages/LectureChat";
import LectureSummary from "./pages/LectureSummary";
import LectureSummaryFull from "./pages/LectureSummaryFull";
import QuizConfiguration from "./components/QuizConfiguration";
import TakeQuiz from "./pages/TakeQuiz";
import Flashcards from "./pages/Flashcards";
import StudyPlan from "./pages/StudyPlan";
import Resources from "./pages/Resources";
import Story from "./pages/Story";
import StoryNodes from "./pages/StoryNodes";
import StoryContent from "./pages/StoryContent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/account-type" element={<AccountType />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/index" element={<LandingPage />} />
            <Route path="/uploaded-courses" element={<UploadedCourses />} />
            <Route path="/professor-courses" element={<ProfessorCourses />} />
            <Route path="/invited-courses" element={<InvitedCourses />} />
            <Route path="/course/:courseId" element={<Course />} />
            <Route path="/course/:courseId/lecture/:lectureId/chat" element={<LectureChat />} />
            <Route path="/course/:courseId/lecture/:lectureId/highlights" element={<LectureSummary />} />
            <Route 
              path="/course/:courseId/lecture/:lectureId/highlights/fullversion" 
              element={<LectureSummaryFull />} 
            />
            <Route 
              path="/course/:courseId/lecture/:lectureId/quiz" 
              element={<QuizConfiguration />} 
            />
            <Route path="/course/:courseId/lecture/:lectureId/take-quiz" element={<TakeQuiz />} />
            <Route path="/course/:courseId/lecture/:lectureId/flashcards" element={<Flashcards />} />
            <Route path="/course/:courseId/lecture/:lectureId/study-plan" element={<StudyPlan />} />
            <Route path="/course/:courseId/lecture/:lectureId/resources" element={<Resources />} />
            <Route path="/course/:courseId/lecture/:lectureId/story" element={<Story />} />
            <Route path="/course/:courseId/lecture/:lectureId/story/nodes" element={<StoryNodes />} />
            <Route 
              path="/course/:courseId/lecture/:lectureId/story/content/:nodeId" 
              element={<StoryContent />} 
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
