import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Course from "./pages/Course";
import LectureChat from "./pages/LectureChat";
import LectureSummary from "./pages/LectureSummary";
import LectureSummaryFull from "./pages/LectureSummaryFull";
import QuizConfiguration from "./components/QuizConfiguration";
import TakeQuiz from "./pages/TakeQuiz";
import Flashcards from "./pages/Flashcards";
import Mindmap from "./pages/Mindmap";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/course/:courseId" element={<Course />} />
          <Route path="/course/:courseId/lecture/:lectureId/chat" element={<LectureChat />} />
          <Route path="/course/:courseId/lecture/:lectureId/summary" element={<LectureSummary />} />
          <Route 
            path="/course/:courseId/lecture/:lectureId/summary/fullversion" 
            element={<LectureSummaryFull />} 
          />
          <Route 
            path="/course/:courseId/lecture/:lectureId/quiz" 
            element={<QuizConfiguration />} 
          />
          <Route path="/course/:courseId/lecture/:lectureId/take-quiz" element={<TakeQuiz />} />
          <Route path="/course/:courseId/lecture/:lectureId/flashcards" element={<Flashcards />} />
          <Route path="/course/:courseId/lecture/:lectureId/mindmap" element={<Mindmap />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;