
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

interface Segment {
  title: string;
  sequence_number: number;
}

// Predefined positions for title boxes (in percentages)
const titlePositions = [
  { left: '20%', top: '20%' },
  { left: '60%', top: '25%' },
  { left: '30%', top: '45%' },
  { left: '70%', top: '50%' },
  { left: '25%', top: '70%' },
];

const AIProfessorLoading = () => {
  const { lectureId } = useParams();

  const { data: segments } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('title, sequence_number')
        .eq('lecture_id', parseInt(lectureId))
        .order('sequence_number');

      if (error) throw error;
      return data as Segment[];
    }
  });

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl aspect-[16/9] relative bg-slate-900 rounded-lg overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20" />
          
          {/* Title boxes */}
          {segments?.map((segment, index) => {
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
