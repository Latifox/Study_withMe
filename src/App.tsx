import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Course from "./pages/Course";
import LectureChat from "./pages/LectureChat";
import LectureSummary from "./pages/LectureSummary";
import QuizConfiguration from "./components/QuizConfiguration";
import TakeQuiz from "./pages/TakeQuiz";
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
          <Route path="/course/:courseId/lecture/:lectureId/quiz" element={<QuizConfiguration />} />
          <Route path="/course/:courseId/lecture/:lectureId/take-quiz" element={<TakeQuiz />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;