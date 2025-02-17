
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();

  // Check if content already exists
  const { data: segmentContent } = useQuery({
    queryKey: ['check-segments-content', lectureId],
    queryFn: async () => {
      if (!lectureId) return null;
      
      const { data, error } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', parseInt(lectureId));

      if (error) throw error;
      return data;
    },
    enabled: !!lectureId
  });

  useEffect(() => {
    if (!courseId || !lectureId) return;

    if (segmentContent && segmentContent.length > 0) {
      // Content exists, go directly to nodes
      navigate(`/course/${courseId}/lecture/${lectureId}/story/nodes`);
    } else {
      // No content yet, show loading visualization
      navigate(`/course/${courseId}/lecture/${lectureId}/story/loading`);
    }
  }, [courseId, lectureId, navigate, segmentContent]);

  return null;
};

export default Story;

