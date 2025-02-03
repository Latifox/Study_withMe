import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/Home";
import Course from "@/pages/Course";
import Lecture from "@/pages/Lecture";
import Story from "@/pages/Story";
import LearningPathway from "@/pages/LearningPathway";
import TakeQuiz from "@/pages/TakeQuiz";
import { ThemeProvider } from "@/components/theme-provider";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/course/:courseId",
    element: <Course />,
  },
  {
    path: "/course/:courseId/lecture/:lectureId",
    element: <Lecture />,
  },
  {
    path: "/course/:courseId/lecture/:lectureId/story",
    element: <LearningPathway />
  },
  {
    path: "/course/:courseId/lecture/:lectureId/story/segment/:segment",
    element: <Story />
  },
  {
    path: "/course/:courseId/lecture/:lectureId/quiz",
    element: <TakeQuiz />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;