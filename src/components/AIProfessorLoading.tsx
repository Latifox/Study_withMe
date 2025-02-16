
import { useState, useEffect } from "react";
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

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-600/90 via-purple-500/90 to-indigo-600/90">
      {/* Grid background */}
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
          <motion.div 
            className="relative w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {segments && segments.length > 0 ? (
              <div className="relative">
                {/* Curved connection line */}
                <svg
                  className="absolute inset-0 w-full h-full z-0 pointer-events-none"
                  style={{ top: '-20px' }}
                >
                  <motion.path
                    d={`M 50,${100} C 100,${150} 200,${200} 300,${250} S 400,${300} 500,${350}`}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.5)"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                </svg>

                {/* Segments with concepts */}
                <div className="relative z-10">
                  {segments.map((segment, index) => {
                    const concepts = segment.segment_description
                      .replace(/Key concepts to explore: /g, '')
                      .split(', ');

                    return (
                      <motion.div
                        key={segment.sequence_number}
                        className={`relative mb-24 ${
                          index % 2 === 0 ? 'ml-12' : 'ml-48'
                        }`}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: index * 0.3,
                          ease: "easeOut"
                        }}
                      >
                        {/* Segment title */}
                        <motion.div
                          className="bg-white/20 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/30 inline-block"
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <h3 className="text-xl font-semibold text-white">
                            {segment.title}
                          </h3>
                        </motion.div>

                        {/* Concepts */}
                        <div className="mt-4 flex flex-wrap gap-3">
                          {concepts.map((concept, conceptIndex) => (
                            <motion.div
                              key={conceptIndex}
                              className="relative"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.3,
                                delay: index * 0.3 + conceptIndex * 0.1
                              }}
                            >
                              {/* Concept bubble */}
                              <div className="relative">
                                <div className="absolute inset-0 bg-white/10 rounded-full blur-sm" />
                                <div className="relative bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30 shadow-sm">
                                  <span className="text-sm text-white font-medium">
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
                  <motion.div
                    animate={{ scale: [1, 0.9, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 0.9, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3, delay: 0.2 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 0.9, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.3, delay: 0.4 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </Card>
      </div>
    </div>
  );
};

export default AIProfessorLoading;
