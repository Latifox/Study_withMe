interface SegmentProgressProps {
  currentSegment: number;
  totalSegments: number;
  currentStep: number;
  totalSteps: number;
}

const SegmentProgress = ({ currentSegment, totalSegments, currentStep, totalSteps }: SegmentProgressProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Step {currentStep + 1} of {totalSteps}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary rounded-full h-2 transition-all"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default SegmentProgress;