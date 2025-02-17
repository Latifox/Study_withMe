
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Segment {
  title: string;
  sequence_number: number;
}

interface Position {
  left: string;
  top: string;
}

interface AIProfessorLoadingProps {
  lectureId: number;
}

// Predefined positions for title boxes (in percentages)
const titlePositions = [
  { left: '20%', top: '20%' },
  { left: '60%', top: '25%' },
  { left: '30%', top: '45%' },
  { left: '70%', top: '50%' },
  { left: '25%', top: '70%' },
];

// Helper function to convert percentage string to number
const percentToNumber = (percent: string): number => {
  return parseFloat(percent.replace('%', ''));
};

const AIProfessorLoading = ({ lectureId }: AIProfessorLoadingProps) => {
  console.log('Loading screen for lecture:', lectureId);

  const { data: segments, isLoading, error } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {      
      console.log('Fetching segments for lecture:', lectureId);
      
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('title, sequence_number')
        .eq('lecture_id', lectureId)
        .order('sequence_number');

      if (error) {
        console.error('Error fetching segments:', error);
        throw error;
      }

      console.log('Fetched segments:', data);
      return data as Segment[];
    },
    // Poll every 2 seconds until we get segments
    refetchInterval: (data: { state: { data: Segment[] | undefined } }) => {
      const segments = data?.state?.data;
      return !segments || segments.length === 0 ? 2000 : false;
    },
    // Keep polling even if the window is not focused
    refetchIntervalInBackground: true,
    // Retry failed requests
    retry: true,
    retryDelay: 1000,
    // Keep retrying until we get data
    retryOnMount: true,
    // Enable suspense to handle loading state
    enabled: !!lectureId
  });

  console.log('Current render state:', { isLoading, error, segmentsCount: segments?.length });

  if (isLoading || (!segments || segments.length === 0)) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white">
            Generating content for lecture {lectureId}...
            {isLoading ? " (Checking for segments...)" : " (Waiting for segments to be generated...)"}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-red-500">Error loading segments: {error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl aspect-[16/9] relative bg-slate-900 rounded-lg overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
          
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full">
            {segments.map((segment, index) => {
              if (index >= titlePositions.length - 1) return null;
              
              const currentPos = titlePositions[index];
              const nextPos = titlePositions[index + 1];
              
              const x1 = percentToNumber(currentPos.left);
              const y1 = percentToNumber(currentPos.top);
              const x2 = percentToNumber(nextPos.left);
              const y2 = percentToNumber(nextPos.top);

              return (
                <g key={`connection-${index}`}>
                  {/* Background line (glow effect) */}
                  <line
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    className="stroke-white/10"
                    strokeWidth="4"
                  />
                  {/* Foreground line */}
                  <line
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    className="stroke-white/40"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Title boxes */}
          {segments.map((segment, index) => {
            if (index >= titlePositions.length) return null;
            const position = titlePositions[index];

            return (
              <div
                key={segment.sequence_number}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: position.left,
                  top: position.top,
                }}
              >
                <div className="bg-black/90 text-white px-6 py-3 rounded-md text-sm font-medium shadow-lg border border-white/10">
                  {segment.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AIProfessorLoading;
