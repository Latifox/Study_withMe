
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LearningStep } from "@/types/study-plan";
import { getActionIcon } from "@/utils/studyPlanUtils";

interface LearningStepCardProps {
  step: LearningStep;
  courseId: string;
  lectureId: string;
}

const LearningStepCard = ({ step, courseId, lectureId }: LearningStepCardProps) => {
  const navigate = useNavigate();
  const IconComponent = getActionIcon(step.action);

  const handleActionClick = (action: string) => {
    switch (action) {
      case 'summary':
        navigate(`/course/${courseId}/lecture/${lectureId}/highlights`);
        break;
      case 'story':
        navigate(`/course/${courseId}/lecture/${lectureId}/story`);
        break;
      case 'chat':
        navigate(`/course/${courseId}/lecture/${lectureId}/chat`);
        break;
      case 'flashcards':
        navigate(`/course/${courseId}/lecture/${lectureId}/flashcards`);
        break;
      case 'quiz':
        navigate(`/course/${courseId}/lecture/${lectureId}/take-quiz`);
        break;
      case 'resources':
        navigate(`/course/${courseId}/lecture/${lectureId}/resources`);
        break;
    }
  };

  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] bg-white/10 backdrop-blur-md border-white/20">
      <div className="p-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
            {IconComponent && <IconComponent className="w-6 h-6" />}
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-white">{step.title}</h3>
              <span className="text-sm text-white/60">{step.timeEstimate}</span>
            </div>
            <p className="text-white/80 mb-4">{step.description}</p>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {step.benefits.map((benefit, i) => (
                  <span
                    key={i}
                    className="text-sm text-white/60 bg-white/5 px-2 py-1 rounded border border-white/10"
                  >
                    {benefit}
                  </span>
                ))}
              </div>
              <Button
                onClick={() => handleActionClick(step.action)}
                className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white font-semibold border-2 border-white/30 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-[0_0_15px_rgba(255,255,255,0.2)] px-6 py-2"
              >
                Start This Step
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default LearningStepCard;
