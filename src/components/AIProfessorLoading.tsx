
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Segment {
  title: string;
  segment_description: string;
  sequence_number: number;
}

const AIProfessorLoading = ({ lectureId }: { lectureId: string }) => {
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
  const { data: segmentContent, isLoading: isContentLoading } = useQuery({
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
    enabled: !!segments,
    refetchInterval: 2000,
    retry: true,
    retryDelay: 1000
  });

  // Monitor content generation status
  useEffect(() => {
    if (!isContentLoading && segmentContent && segments) {
      // Check if all segments have their content fully generated
      const allContentGenerated = segments.every(segment => 
        segmentContent.some(content => 
          content.sequence_number === segment.sequence_number &&
          content.theory_slide_1 && 
          content.theory_slide_2 &&
          content.quiz_1_question &&
          content.quiz_2_question
        )
      );

      console.log('Content generation status:', {
        segmentsCount: segments.length,
        contentCount: segmentContent.length,
        allContentGenerated
      });
    }
  }, [segmentContent, segments, isContentLoading]);

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
              {/* Title with loading indicator */}
              <motion.div
                className="text-center mb-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold text-white mb-2">Learning Journey Map</h2>
                <div className="flex justify-center items-center gap-2">
                  <span className="text-white/80 text-sm">Generating content</span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                        className="w-1.5 h-1.5 bg-white rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>

              <div className="flex flex-col gap-16">
                {segments.map((segment, index) => {
                  const concepts = segment.segment_description
                    .replace(/Key concepts to explore: /g, '')
                    .split(', ');

                  const isContentReady = segmentContent?.some(content => 
                    content.sequence_number === segment.sequence_number &&
                    content.theory_slide_1 && 
                    content.theory_slide_2
                  );

                  return (
                    <motion.div
                      key={segment.sequence_number}
                      className={`relative ${index % 2 === 0 ? 'ml-12' : 'ml-48'}`}
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.2 }}
                    >
                      {/* Connection line with animation */}
                      {index < segments.length - 1 && (
                        <motion.div
                          className="absolute h-16 w-1"
                          style={{
                            left: '2rem',
                            top: '100%',
                            background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)'
                          }}
                          initial={{ scaleY: 0, opacity: 0 }}
                          animate={{ 
                            scaleY: 1, 
                            opacity: 1,
                          }}
                          transition={{ 
                            duration: 1,
                            delay: index * 0.3,
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                        />
                      )}

                      {/* Segment title with processing indicator */}
                      <motion.div
                        className="relative group"
                        animate={{ 
                          boxShadow: isContentReady 
                            ? ["0 0 0 rgba(255,255,255,0.2)", "0 0 20px rgba(255,255,255,0.4)", "0 0 0 rgba(255,255,255,0.2)"]
                            : ["0 0 0 rgba(255,255,255,0.2)"]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <div className="absolute inset-0 bg-white/20 rounded-xl blur-lg group-hover:bg-white/30 transition-all" />
                        <div className={`relative backdrop-blur-md p-4 rounded-xl border shadow-lg
                          ${isContentReady ? 'bg-white/40 border-white/50' : 'bg-white/20 border-white/30'}`}>
                          <h3 className="text-xl font-bold text-white">
                            {segment.title}
                          </h3>
                        </div>
                      </motion.div>

                      {/* Animated concepts */}
                      <div className="mt-4 flex flex-wrap gap-3 ml-8">
                        {concepts.map((concept, conceptIndex) => (
                          <motion.div
                            key={conceptIndex}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ 
                              opacity: 1, 
                              scale: 1,
                              y: [0, -5, 0]
                            }}
                            transition={{
                              duration: 2,
                              delay: index * 0.2 + conceptIndex * 0.1,
                              repeat: Infinity,
                              repeatDelay: Math.random() * 2
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
