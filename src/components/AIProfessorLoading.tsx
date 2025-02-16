
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Segment {
  title: string;
  segment_description: string;
  sequence_number: number;
}

const AIProfessorLoading = ({ lectureId }: { lectureId: string }) => {
  const navigate = useNavigate();

  // Fetch segments data
  const { data: segments } = useQuery({
    queryKey: ['lecture-segments', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lecture_segments')
        .select('*')
        .eq('lecture_id', parseInt(lectureId))
        .order('sequence_number');

      if (error) throw error;
      return data as Segment[];
    }
  });

  // Check if content is ready
  const { data: segmentContent } = useQuery({
    queryKey: ['segments-content', lectureId],
    queryFn: async () => {
      if (!segments) return null;
      
      const { data, error } = await supabase
        .from('segments_content')
        .select('*')
        .eq('lecture_id', parseInt(lectureId));

      if (error) throw error;
      return data;
    },
    enabled: !!segments
  });

  // Redirect when content is ready
  useEffect(() => {
    if (segmentContent && segments && segmentContent.length === segments.length) {
      const timer = setTimeout(() => {
        navigate(`/course/${lectureId}/story/nodes`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [segmentContent, segments, lectureId, navigate]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-600/90 via-purple-500/90 to-indigo-600/90">
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="min-h-screen relative z-10 flex flex-col items-center justify-center p-8">
        <Card className="w-full max-w-5xl min-h-[600px] p-8 bg-white/20 backdrop-blur-md border-white/20">
          {segments && segments.length > 0 ? (
            <div className="relative h-full">
              {/* Main title at the top */}
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-white">Learning Journey Map</h2>
              </motion.div>

              <div className="flex flex-col gap-16">
                {segments.map((segment, index) => {
                  const concepts = segment.segment_description
                    .replace(/Key concepts to explore: /g, '')
                    .split(', ');

                  return (
                    <motion.div
                      key={segment.sequence_number}
                      className={`relative ${index % 2 === 0 ? 'ml-12' : 'ml-48'}`}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                    >
                      {/* Connection line to next segment */}
                      {index < segments.length - 1 && (
                        <motion.div
                          className="absolute h-16 w-1 bg-gradient-to-b from-white/50 to-transparent"
                          style={{
                            left: '2rem',
                            top: '100%',
                          }}
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
                        />
                      )}

                      {/* Segment title with glowing effect */}
                      <motion.div
                        className="relative group"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="absolute inset-0 bg-white/20 rounded-xl blur-lg group-hover:bg-white/30 transition-all" />
                        <div className="relative bg-white/30 backdrop-blur-md p-4 rounded-xl border border-white/40 shadow-lg">
                          <h3 className="text-xl font-bold text-white">
                            {segment.title}
                          </h3>
                        </div>
                      </motion.div>

                      {/* Concepts cloud */}
                      <div className="mt-4 flex flex-wrap gap-3 ml-8">
                        {concepts.map((concept, conceptIndex) => (
                          <motion.div
                            key={conceptIndex}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.3,
                              delay: index * 0.2 + conceptIndex * 0.1
                            }}
                          >
                            <div className="relative group">
                              <div className="absolute inset-0 bg-white/10 rounded-full blur-sm group-hover:bg-white/20 transition-all" />
                              <div className="relative bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm">
                                <span className="text-sm text-white/90 font-medium">
                                  {concept}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full">
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 0.9, 1] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      repeatDelay: 0.3,
                      delay: i * 0.2
                    }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AIProfessorLoading;
