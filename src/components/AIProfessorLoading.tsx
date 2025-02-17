
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
    refetchInterval: (data: { state: { data: Segment[] | undefined } }) => {
      const segments = data?.state?.data;
      return !segments || segments.length === 0 ? 2000 : false;
    },
    refetchIntervalInBackground: true,
    retry: true,
    retryDelay: 1000,
    retryOnMount: true,
    enabled: !!lectureId
  });

  console.log('Current render state:', { isLoading, error, segmentsCount: segments?.length });

  if (isLoading || (!segments || segments.length === 0)) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white/80 flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <div className="text-lg font-medium">
              Generating content for lecture {lectureId}...
            </div>
            <div className="text-sm text-white/60">
              {isLoading ? "Checking for segments..." : "Waiting for segments to be generated..."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-red-400 bg-red-500/10 px-6 py-4 rounded-lg border border-red-500/20">
            Error loading segments: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl aspect-[16/9] relative bg-slate-900/50 rounded-xl overflow-hidden backdrop-blur-sm border border-white/5">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
          
          {/* Animated background shapes */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse-slow" />
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full filter blur-3xl animate-pulse-slow animation-delay-2000" />
          </div>
          
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
                <g key={`connection-${index}`} className="opacity-0 animate-fade-in" style={{ animationDelay: `${index * 200}ms` }}>
                  {/* Background line (glow effect) */}
                  <line
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    className="stroke-white/5"
                    strokeWidth="6"
                  />
                  {/* Foreground line */}
                  <line
                    x1={`${x1}%`}
                    y1={`${y1}%`}
                    x2={`${x2}%`}
                    y2={`${y2}%`}
                    className="stroke-white/20"
                    strokeWidth="2"
                    strokeDasharray="6 4"
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
                className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-0 animate-fade-in"
                style={{
                  left: position.left,
                  top: position.top,
                  animationDelay: `${index * 200}ms`
                }}
              >
                <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-lg text-sm font-medium shadow-xl border border-white/10 hover:border-white/20 transition-colors">
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
