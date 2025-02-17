
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
    <div className="fixed inset-0 bg-emerald-500">
      {/* Grid background */}
      <div className="absolute inset-0">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Modules and connections */}
      <div className="relative z-10 min-h-screen">
        <div className="absolute inset-0">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {Array.from({ length: 4 }).map((_, i) => (
              <path
                key={`path-${i}`}
                d={`M ${15 + i * 20} ${20 + i * 15} L ${35 + i * 20} ${35 + i * 15}`}
                stroke="#1a3c34"
                strokeWidth="2"
                strokeDasharray="4"
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${i * 300}ms` }}
              />
            ))}
          </svg>

          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`module-${i}`}
              className="absolute opacity-0 animate-fade-in"
              style={{
                left: `${15 + (i % 5) * 20}%`,
                top: `${20 + i * 15}%`,
                animationDelay: `${i * 300}ms`
              }}
            >
              <div className="bg-slate-800/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium shadow-xl border border-white/20 hover:border-white/40 transition-colors">
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
