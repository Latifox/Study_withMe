
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

// Fixed positions for the mind map template
const titlePositions = [
  { left: '25%', top: '15%' },    // Top left
  { left: '75%', top: '15%' },    // Top right
  { left: '50%', top: '40%' },    // Middle
  { left: '75%', top: '65%' },    // Bottom right
  { left: '25%', top: '65%' },    // Bottom left
];

// Connection paths for the template
const connectionPaths = [
  'M 25 15 Q 50 15, 75 15',       // Top connection
  'M 75 15 Q 75 40, 50 40',       // Right top to middle
  'M 25 15 Q 25 40, 50 40',       // Left top to middle
  'M 50 40 Q 75 40, 75 65',       // Middle to bottom right
  'M 50 40 Q 25 40, 25 65',       // Middle to bottom left
];

const AIProfessorLoading = ({ lectureId }: AIProfessorLoadingProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {      
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('title, sequence_number')
        .eq('lecture_id', lectureId)
        .order('sequence_number');

      if (error) throw error;
      return data as Segment[];
    },
    refetchInterval: (data) => {
      return !data || data.length === 0 ? 2000 : false;
    },
  });

  if (isLoading || !data || data.length === 0) {
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
          {/* Fixed template connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
            {connectionPaths.map((path, index) => (
              <path
                key={`connection-${index}`}
                d={path}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${index * 200}ms` }}
                stroke="white"
                strokeOpacity="0.2"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                fill="none"
              />
            ))}
          </svg>
          
          {/* Content boxes */}
          {data.map((segment, index) => {
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
