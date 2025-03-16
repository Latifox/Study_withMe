
import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Loader2 } from "lucide-react";
import PodcastViewer from "@/components/podcast/PodcastViewer";

export default function Podcast() {
  const { lectureId, courseId } = useParams();

  return (
    <>
      <Helmet>
        <title>Lecture Podcast | EduAI</title>
      </Helmet>
      <div className="min-h-screen bg-white">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        }>
          <PodcastViewer />
        </Suspense>
      </div>
    </>
  );
}
