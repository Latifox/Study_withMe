
interface SegmentProgressProps {
  currentSegment: number;
  totalSegments: number;
  currentStep: number;
  totalSteps: number;
}

const SegmentProgress = ({ currentSegment, totalSegments, currentStep, totalSteps }: SegmentProgressProps) => {
  return (
    <div className="space-y-2">
      <div className="w-full bg-blue-100/50 rounded-full h-3 backdrop-blur-sm border border-blue-200/30">
        <div
          className="bg-blue-500/80 rounded-full h-full transition-all duration-300 shadow-sm"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default SegmentProgress;
