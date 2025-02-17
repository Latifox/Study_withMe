
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
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-600 to-teal-500">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
          <div className="absolute top-0 right-20 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        </div>
        <div className="min-h-screen flex items-center justify-center relative z-10">
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
      <div className="fixed inset-0 bg-gradient-to-br from-emerald-600 to-teal-500">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
          <div className="absolute top-0 right-20 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
          <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        </div>
        <div className="min-h-screen flex items-center justify-center relative z-10">
          <div className="text-red-400 bg-red-500/10 px-6 py-4 rounded-lg border border-red-500/20">
            Error loading segments: {error.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-600 to-teal-500">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        <div className="absolute top-0 right-20 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 via-transparent to-transparent" />
        
        {/* Mesh grid overlay */}
        <svg className="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-6xl aspect-[16/9] relative bg-slate-900/50 rounded-xl overflow-hidden backdrop-blur-sm border border-white/5">
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full">
            {segments?.map((segment, index) => {
              if (index >= titlePositions.length - 1) return null;
              
              const currentPos = titlePositions[index];
              const nextPos = titlePositions[index + 1];
              
              const x1 = percentToNumber(currentPos.left);
              const y1 = percentToNumber(currentPos.top) + 6; // Bottom of current box
              const x2 = percentToNumber(nextPos.left);
              const y2 = percentToNumber(nextPos.top) - 6; // Top of next box
              
              // Calculate control points for a smooth S-curve
              const dx = x2 - x1;
              const dy = y2 - y1;
              const midY = (y1 + y2) / 2;
              
              const path = `
                M ${x1}% ${y1}%
                C ${x1}% ${midY}%,
                  ${x2}% ${midY}%,
                  ${x2}% ${y2}%
              `;

              return (
                <g key={`connection-${index}`} className="opacity-0 animate-fade-in" style={{ animationDelay: `${index * 200}ms` }}>
                  {/* Background path (glow effect) */}
                  <path
                    d={path}
                    className="stroke-white/5"
                    strokeWidth="6"
                    fill="none"
                  />
                  {/* Foreground path */}
                  <path
                    d={path}
                    className="stroke-white/20"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="6 4"
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Title boxes */}
          {segments?.map((segment, index) => {
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
