import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "@/components/Root";
import NotFound from "@/components/NotFound";
import Index from "@/pages/Index";
import Course from "@/pages/Course";
import LectureChat from "@/pages/LectureChat";
import LectureSummary from "@/pages/LectureSummary";
import LectureSummaryFull from "@/pages/LectureSummaryFull";
import StudyPlan from "@/pages/StudyPlan";
import Resources from "@/pages/Resources";
import TakeQuiz from "@/pages/TakeQuiz";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Index />,
      },
      {
        path: "course/:courseId",
        element: <Course />,
      },
      {
        path: "course/:courseId/lecture/:lectureId/chat",
        element: <LectureChat />,
      },
      {
        path: "course/:courseId/lecture/:lectureId/summary",
        element: <LectureSummary />,
      },
      {
        path: "course/:courseId/lecture/:lectureId/summary/fullversion",
        element: <LectureSummaryFull />,
      },
      {
        path: "course/:courseId/lecture/:lectureId/studyplan",
        element: <StudyPlan />,
      },
      {
        path: "course/:courseId/lecture/:lectureId/resources",
        element: <Resources />,
      },
      {
        path: "course/:courseId/lecture/:lectureId/quiz",
        element: <TakeQuiz />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;