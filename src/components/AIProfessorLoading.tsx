
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

interface Segment {
  title: string;
  segment_description: string;
  sequence_number: number;
}

// Predefined positions for the content boxes (in percentages)
const contentLocations = [
  // North America region
  { title: { left: '15%', top: '25%' }, description: { left: '25%', top: '25%' } },
  // South America region
  { title: { left: '25%', top: '60%' }, description: { left: '35%', top: '60%' } },
  // Europe region
  { title: { left: '45%', top: '20%' }, description: { left: '55%', top: '20%' } },
  // Africa region
  { title: { left: '45%', top: '45%' }, description: { left: '55%', top: '45%' } },
  // Asia region
  { title: { left: '65%', top: '30%' }, description: { left: '75%', top: '30%' } },
  // Australia region
  { title: { left: '75%', top: '65%' }, description: { left: '85%', top: '65%' } },
];

const AIProfessorLoading = () => {
  const { lectureId } = useParams();

  const { data: segments } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error('Lecture ID is required');
      
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('*')
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
          {/* Background gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10" />
          
          {/* Content boxes */}
          {segments?.map((segment, index) => {
            if (index >= contentLocations.length) return null;
            const location = contentLocations[index];

            return (
              <div key={segment.sequence_number} className="absolute">
                {/* Title box */}
                <div 
                  className="absolute whitespace-nowrap"
                  style={{
                    left: location.title.left,
                    top: location.title.top,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="bg-black/80 text-white px-4 py-2 rounded text-sm font-medium shadow-lg">
                    {segment.title}
                  </div>
                </div>

                {/* Description box */}
                <div 
                  className="absolute"
                  style={{
                    left: location.description.left,
                    top: location.description.top,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="bg-red-500/80 text-white px-4 py-2 rounded text-xs max-w-[200px] shadow-lg">
                    {segment.segment_description.slice(0, 100)}...
                  </div>
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
