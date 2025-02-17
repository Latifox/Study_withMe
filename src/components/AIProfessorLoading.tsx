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

const getConnectionPath = (start: Position, end: Position) => {
  const startX = parseFloat(start.left);
  const startY = parseFloat(start.top);
  const endX = parseFloat(end.left);
  const endY = parseFloat(end.top);
  
  const midY = (startY + endY) / 2;
  const cp1x = startX + (endX - startX) * 0.2;
  const cp2x = startX + (endX - startX) * 0.8;
  
  return `M ${startX} ${startY} C ${cp1x} ${midY}, ${cp2x} ${midY}, ${endX} ${endY}`;
};

const getDescriptionPath = (start: Position, end: Position) => {
  const startX = parseFloat(start.left);
  const startY = parseFloat(start.top);
  const endX = parseFloat(end.left);
  const endY = parseFloat(end.top);
  
  const angle = Math.atan2(endY - startY, endX - startX);
  const boxPadding = 8;
  
  const adjustedStartX = startX + (boxPadding * Math.cos(angle));
  const adjustedStartY = startY + (boxPadding * Math.sin(angle));
  const adjustedEndX = endX - (boxPadding * Math.cos(angle));
  const adjustedEndY = endY - (boxPadding * Math.sin(angle));
  
  return {
    path: `M ${adjustedStartX} ${adjustedStartY} L ${adjustedEndX} ${adjustedEndY}`,
    angle: (angle * 180) / Math.PI
  };
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

  const baseDelay = 600;
  const getEmptyBoxDelay = (index: number) => index * (baseDelay * 2);
  const getConnectorDelay = (index: number) => (index * (baseDelay * 2)) + baseDelay;
  const getTitleDelay = (index: number) => (titlePositions.length * (baseDelay * 2)) + (index * baseDelay * 3);
  const getDescriptionDelay = (index: number) => {
    const lastTitleDelay = getTitleDelay(titlePositions.length - 1);
    const titleTypingDuration = baseDelay * 2;
    return lastTitleDelay + titleTypingDuration + (index * baseDelay * 2);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-600 to-teal-500">
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        <div className="absolute top-0 right-20 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse-slow" />
        
        <svg className="w-full h-full absolute inset-0" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
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
          
          {displayedSegments.slice(0, -1).map((_, index) => (
            <path
              key={`connection-${index}`}
              d={getConnectionPath(
                { left: `${parseFloat(titlePositions[index].left)}`, top: `${parseFloat(titlePositions[index].top)}` },
                { left: `${parseFloat(titlePositions[index + 1].left)}`, top: `${parseFloat(titlePositions[index + 1].top)}` }
              )}
              className="opacity-0 animate-fade-in"
              style={{ animationDelay: `${getConnectorDelay(index)}ms` }}
              stroke="#0F172A"
              strokeOpacity="0.8"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          
          {displayedSegments.map((_, index) => {
            const { path } = getDescriptionPath(
              { left: `${parseFloat(titlePositions[index].left)}`, top: `${parseFloat(titlePositions[index].top)}` },
              { left: `${parseFloat(descriptionPositions[index].left)}`, top: `${parseFloat(descriptionPositions[index].top)}` }
            );
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
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
      </div>
      
      <div className="relative z-10 min-h-screen">
        <div className="w-full flex justify-center pt-8">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        
        <div className="absolute inset-0">
          {displayedSegments.map((segment, index) => {
            const boxDelay = getEmptyBoxDelay(index);
            const textDelay = getTitleDelay(index);
            
            return (
              <div
                key={`title-box-${index}`}
                style={{
                  position: 'absolute',
                  left: titlePositions[index].left,
                  top: titlePositions[index].top,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: `${boxDelay}ms` }}
                >
                  <div className="min-w-[160px] h-[48px] bg-slate-900/80 backdrop-blur-md rounded-lg border border-white/10 hover:border-white/20 transition-colors shadow-xl flex items-center justify-center px-6 py-3">
                    <div 
                      className="opacity-0 animate-fade-in text-white text-sm font-medium"
                      style={{ animationDelay: `${textDelay}ms` }}
                    >
                      {segment.title}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {displayedSegments.map((segment, index) => (
            <div
              key={`description-box-${index}`}
              style={{
                position: 'absolute',
                left: descriptionPositions[index].left,
                top: descriptionPositions[index].top,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div
                className="opacity-0 animate-fade-in"
                style={{ animationDelay: `${getDescriptionDelay(index)}ms` }}
              >
                <div className="max-w-xs bg-[#ea384c]/80 backdrop-blur-md rounded-lg border border-white/10 hover:border-white/20 transition-colors shadow-xl p-4">
                  <div className="text-white text-xs">
                    {segment.segment_description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AIProfessorLoading;
