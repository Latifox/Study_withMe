import { Routes, Route, useParams } from "react-router-dom";
import Course from "@/pages/Course";
import Index from "@/pages/Index";
import LectureChat from "@/pages/LectureChat";
import LectureSummary from "@/pages/LectureSummary";
import NotFound from "@/pages/NotFound";
import QuizConfiguration from "@/components/QuizConfiguration";
import TakeQuiz from "@/pages/TakeQuiz";
import { Toaster } from "@/components/ui/toaster";

const QuizConfigurationWrapper = () => {
  const { lectureId } = useParams();
  return <QuizConfiguration lectureId={Number(lectureId)} />;
};

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/course/:courseId" element={<Course />} />
        <Route path="/course/:courseId/lecture/:lectureId/chat" element={<LectureChat />} />
        <Route path="/course/:courseId/lecture/:lectureId/summary" element={<LectureSummary />} />
        <Route path="/course/:courseId/lecture/:lectureId/quiz" element={<QuizConfigurationWrapper />} />
        <Route path="/course/:courseId/lecture/:lectureId/take-quiz" element={<TakeQuiz />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
};

export default App;