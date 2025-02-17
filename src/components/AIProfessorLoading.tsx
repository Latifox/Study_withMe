
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AIProfessorLoadingProps {
  lectureId: number;
}

const AIProfessorLoading = ({ lectureId }: AIProfessorLoadingProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {      
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('title, sequence_number, segment_description')
        .eq('lecture_id', lectureId)
        .order('sequence_number');

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.log("No segments found for lecture:", lectureId);
        return [];
      }

      return data;
    },
    refetchInterval: (query) => {
      if (!query.state.data || query.state.data.length === 0) {
        return 2000;
      }
      return false;
    },
    retry: 3,
  });

  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-rose-600 to-red-500 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-white max-w-md mx-auto">
          <h3 className="text-xl font-semibold mb-2">Error Loading Content</h3>
          <p className="opacity-90">Unable to load lecture segments. Please try again later.</p>
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
      
      <div className="relative z-10 min-h-screen">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {Array.from({ length: 5 }).map((_, i) => (
              <path
                key={`connection-${i}`}
                d={`M ${20 + (i % 2) * 60} ${15 + i * 17} L ${80 - (i % 2) * 60} ${32 + i * 17}`}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${i * 200}ms` }}
                stroke="#0F172A"
                strokeOpacity="0.8"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                fill="none"
              />
            ))}
          </svg>
          
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`node-${i}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-0 animate-fade-in"
              style={{
                left: `${20 + (i % 2) * 60}%`,
                top: `${15 + i * 17}%`,
                animationDelay: `${i * 200}ms`
              }}
            >
              <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-lg text-sm font-medium shadow-xl border border-white/10 hover:border-white/20 transition-colors">
                Module {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIProfessorLoading;
