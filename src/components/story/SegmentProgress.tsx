
interface SegmentProgressProps {
  currentSegment: number;
  totalSegments: number;
  currentStep: number;
  totalSteps: number;
}

const SegmentProgress = ({ currentSegment, totalSegments, currentStep, totalSteps }: SegmentProgressProps) => {
  return (
    <div className="space-y-2">
      <div className="w-full bg-blue-200/60 rounded-full h-3 backdrop-blur-sm border border-blue-300/40">
        <div
          className="bg-blue-600/90 rounded-full h-full transition-all duration-300 shadow-md"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default SegmentProgress;
