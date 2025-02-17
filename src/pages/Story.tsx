
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (courseId && lectureId) {
      navigate(`/course/${courseId}/lecture/${lectureId}/story/loading`);
    }
  }, [courseId, lectureId, navigate]);

  return null;
};

export default Story;
