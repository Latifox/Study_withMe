import { useQuery, Query } from "@tanstack/react-query";
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

// Updated positions with even vertical spacing between segments
const titlePositions = [
  { left: '20%', top: '15%' },     // Segment 1
  { left: '80%', top: '35%' },     // Segment 2
  { left: '20%', top: '55%' },     // Segment 3
  { left: '80%', top: '75%' },     // Segment 4
  { left: '20%', top: '95%' },     // Segment 5
];

// Updated connection paths to create even more pronounced curved paths between boxes
const getConnectionPath = (start: Position, end: Position) => {
  // Extract positions without the % sign for SVG calculations
  const startX = parseInt(start.left);
  const startY = parseInt(start.top) + 4; // Add offset to start from bottom of box
  const endX = parseInt(end.left);
  const endY = parseInt(end.top) - 4; // Subtract offset to end at top of box
  
  // Calculate the distance between points
  const dx = endX - startX;
  const dy = endY - startY;
  
  // Create even more pronounced S-curve with adjusted control points
  // Move control points further out vertically for more dramatic curves
  const cp1x = startX + dx * 0.1; // Keep horizontal position close to start
  const cp1y = startY + dy * 0.8; // Move down further for more dramatic curve
  const cp2x = startX + dx * 0.9; // Keep horizontal position close to end
  const cp2y = startY + dy * 0.2; // Move up further for more dramatic curve
  
  // Use cubic Bezier curve for smoother path
  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
};

const AIProfessorLoading = ({ lectureId }: AIProfessorLoadingProps) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {      
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('title, sequence_number')
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

      return data as Segment[];
    },
    refetchInterval: (query) => {
      if (!query.state.data || query.state.data.length === 0) {
        return 2000;
      }
      return false;
    },
    retry: 3, // Retry failed requests up to 3 times
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

  // Limit the number of segments to display to available positions
  const displayedSegments = data.slice(0, titlePositions.length);

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
        {/* Connection paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {displayedSegments.slice(0, -1).map((_, index) => (
            <path
              key={`connection-${index}`}
              d={getConnectionPath(titlePositions[index], titlePositions[index + 1])}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${index * 200}ms` }}
              stroke="#0F172A"
              strokeOpacity="0.8"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              fill="none"
            />
          ))}
        </svg>
        
        {/* Content boxes */}
        {displayedSegments.map((segment, index) => (
          <div
            key={segment.sequence_number}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-0 animate-fade-in"
            style={{
              left: titlePositions[index].left,
              top: titlePositions[index].top,
              animationDelay: `${index * 200}ms`
            }}
          >
            <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-lg text-sm font-medium shadow-xl border border-white/10 hover:border-white/20 transition-colors">
              {segment.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIProfessorLoading;
