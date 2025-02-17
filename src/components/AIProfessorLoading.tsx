
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { TypeAnimation } from 'react-type-animation';

interface Segment {
  title: string;
  sequence_number: number;
  segment_description: string;
}

interface Position {
  left: string;
  top: string;
}

interface AIProfessorLoadingProps {
  lectureId: number;
}

const titlePositions = [
  { left: '20%', top: '15%' },
  { left: '80%', top: '32%' },
  { left: '20%', top: '49%' },
  { left: '80%', top: '66%' },
  { left: '20%', top: '83%' },
];

const descriptionPositions = [
  { left: '55%', top: '15%' },
  { left: '45%', top: '32%' },
  { left: '55%', top: '49%' },
  { left: '45%', top: '66%' },
  { left: '55%', top: '83%' },
];

const getDescriptionPath = (start: Position, end: Position) => {
  const startX = parseInt(start.left);
  const startY = parseInt(start.top);
  const endX = parseInt(end.left);
  const endY = parseInt(end.top);
  
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx);
  
  const titleBoxWidth = 8;  // Percentage of viewport width
  const descBoxWidth = 12;  // Percentage of viewport width
  
  const startPointX = startX + (titleBoxWidth * Math.cos(angle));
  const startPointY = startY + (titleBoxWidth * Math.sin(angle));
  const endPointX = endX - (descBoxWidth * Math.cos(angle));
  const endPointY = endY - (descBoxWidth * Math.sin(angle));
  
  return {
    path: `M ${startPointX} ${startPointY} L ${endPointX} ${endPointY}`,
    angle: Math.atan2(endPointY - startPointY, endPointX - startPointX) * 180 / Math.PI
  };
};

const getConnectionPath = (start: Position, end: Position) => {
  const startX = parseInt(start.left);
  const startY = parseInt(start.top) + 4;
  const endX = parseInt(end.left);
  const endY = parseInt(end.top) - 4;
  
  const dx = endX - startX;
  const dy = endY - startY;
  
  const cp1x = startX + dx * 0.1;
  const cp1y = startY + dy * 0.8;
  const cp2x = startX + dx * 0.9;
  const cp2y = startY + dy * 0.2;
  
  return `M ${startX} ${startY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`;
};

const AIProfessorLoading = ({ lectureId }: AIProfessorLoadingProps) => {
  const { data, error } = useQuery({
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

      return data as Segment[];
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

  const displayedSegments = data && data.length > 0 ? data.slice(0, titlePositions.length) : Array(5).fill({ title: '', sequence_number: 0, segment_description: '' });

  const baseDelay = 600; // Increased base delay in milliseconds
  const getEmptyBoxDelay = (index: number) => index * (baseDelay * 2);
  const getConnectorDelay = (index: number) => (index * (baseDelay * 2)) + baseDelay;
  const getTitleDelay = (index: number) => (titlePositions.length * (baseDelay * 2)) + (index * baseDelay * 3);
  const getDescriptionDelay = (index: number) => (titlePositions.length * (baseDelay * 4)) + (index * baseDelay * 2);

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
            <marker
              id="arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5.5"
              refY="3"
              orient="auto"
              fill="#ea384c"
            >
              <path d="M 0 0 L 6 3 L 0 6 z" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      <div className="relative z-10 min-h-screen">
        <div className="w-full flex justify-center pt-8">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {displayedSegments.slice(0, -1).map((_, index) => (
              <path
                key={`connection-${index}`}
                d={getConnectionPath(titlePositions[index], titlePositions[index + 1])}
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${getConnectorDelay(index)}ms` }}
                stroke="#0F172A"
                strokeOpacity="0.8"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                fill="none"
              />
            ))}
            
            {displayedSegments.map((_, index) => {
              const { path } = getDescriptionPath(titlePositions[index], descriptionPositions[index]);
              return (
                <path
                  key={`description-connection-${index}`}
                  d={path}
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${getDescriptionDelay(index)}ms` }}
                  stroke="#ea384c"
                  strokeOpacity="0.8"
                  strokeWidth="0.5"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
          </svg>
          
          {/* Empty boxes */}
          {displayedSegments.map((_, index) => (
            <div
              key={`empty-box-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-0 animate-fade-in"
              style={{
                left: titlePositions[index].left,
                top: titlePositions[index].top,
                animationDelay: `${getEmptyBoxDelay(index)}ms`
              }}
            >
              <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-lg text-sm font-medium shadow-xl border border-white/10 hover:border-white/20 transition-colors min-w-[120px] min-h-[40px]" />
            </div>
          ))}

          {/* Titles with typing animation */}
          {displayedSegments.map((segment, index) => (
            <div
              key={`title-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-0 animate-fade-in"
              style={{
                left: titlePositions[index].left,
                top: titlePositions[index].top,
                animationDelay: `${getTitleDelay(index)}ms`
              }}
            >
              <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-lg text-sm font-medium shadow-xl border border-white/10 hover:border-white/20 transition-colors">
                <TypeAnimation
                  sequence={[segment.title]}
                  wrapper="div"
                  speed={50}
                  cursor={false}
                />
              </div>
            </div>
          ))}

          {/* Description boxes with their connectors */}
          {displayedSegments.map((segment, index) => (
            <div
              key={`description-${index}`}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-0 animate-fade-in max-w-xs"
              style={{
                left: descriptionPositions[index].left,
                top: descriptionPositions[index].top,
                animationDelay: `${getDescriptionDelay(index)}ms`
              }}
            >
              <div 
                className="bg-[#ea384c]/80 backdrop-blur-md text-white p-4 rounded-lg text-xs shadow-xl border border-white/10 hover:border-white/20 transition-colors"
              >
                <TypeAnimation
                  sequence={[segment.segment_description]}
                  wrapper="div"
                  speed={50}
                  cursor={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIProfessorLoading;
