import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/course/${courseId}/lecture/${lectureId}/story/nodes`);
  }, [courseId, lectureId, navigate]);

  return null;
};

export default Story;