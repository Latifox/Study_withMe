import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ZoomIn, ZoomOut, X } from "lucide-react";

interface Concept {
  id: string;
  title: string;
  description: string;
  quotes: string[];
  position: { x: number; y: number };
  connections: string[];
  quiz: {
    trueFalse: {
      question: string;
      answer: boolean;
      explanation: string;
    };
    multipleChoice: {
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    };
  };
}

interface StoryContent {
  concepts: Concept[];
}

const Story = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [zoom, setZoom] = useState(1);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [completedConcepts, setCompletedConcepts] = useState<Set<string>>(new Set());

  const { data: storyContent, isLoading } = useQuery({
    queryKey: ['story-content', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-story-content', {
        body: { lectureId }
      });

      if (error) throw error;
      return data.storyContent as StoryContent;
    },
    meta: {
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to load story content. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));

  const handleConceptClick = (concept: Concept) => {
    setSelectedConcept(concept);
  };

  const handleConceptComplete = (conceptId: string) => {
    setCompletedConcepts(prev => new Set([...prev, conceptId]));
    setSelectedConcept(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="animate-pulse text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-lg text-muted-foreground">Generating your interactive story...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/course/${courseId}`)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Course
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="relative h-[calc(100vh-12rem)] border rounded-lg bg-white shadow-sm overflow-hidden">
          <div
            className="absolute inset-0 transition-transform duration-300"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
            }}
          >
            {storyContent?.concepts.map((concept) => (
              <motion.div
                key={concept.id}
                className="absolute"
                style={{
                  left: `${concept.position.x}%`,
                  top: `${concept.position.y}%`,
                }}
                whileHover={{ scale: 1.05 }}
              >
                <Button
                  variant={completedConcepts.has(concept.id) ? "default" : "outline"}
                  className={`rounded-full p-4 ${
                    completedConcepts.has(concept.id) ? "bg-green-500 text-white" : ""
                  }`}
                  onClick={() => handleConceptClick(concept)}
                >
                  {concept.title}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selectedConcept && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
            >
              <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{selectedConcept.title}</h2>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConcept(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <h3 className="text-lg font-semibold">Description</h3>
                    <p>{selectedConcept.description}</p>

                    <h3 className="text-lg font-semibold mt-4">Key Quotes</h3>
                    {selectedConcept.quotes.map((quote, index) => (
                      <blockquote key={index} className="border-l-4 pl-4 italic">
                        {quote}
                      </blockquote>
                    ))}

                    <div className="mt-6 space-y-4">
                      <h3 className="text-lg font-semibold">Quick Quiz</h3>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium mb-2">True or False:</p>
                        <p>{selectedConcept.quiz.trueFalse.question}</p>
                        <div className="mt-2 space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              toast({
                                title: selectedConcept.quiz.trueFalse.answer === true ? "Correct!" : "Incorrect",
                                description: selectedConcept.quiz.trueFalse.explanation,
                              });
                            }}
                          >
                            True
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              toast({
                                title: selectedConcept.quiz.trueFalse.answer === false ? "Correct!" : "Incorrect",
                                description: selectedConcept.quiz.trueFalse.explanation,
                              });
                            }}
                          >
                            False
                          </Button>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="font-medium mb-2">Multiple Choice:</p>
                        <p>{selectedConcept.quiz.multipleChoice.question}</p>
                        <div className="mt-2 space-y-2">
                          {selectedConcept.quiz.multipleChoice.options.map((option) => (
                            <Button
                              key={option}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => {
                                toast({
                                  title: option === selectedConcept.quiz.multipleChoice.correctAnswer ? "Correct!" : "Incorrect",
                                  description: selectedConcept.quiz.multipleChoice.explanation,
                                });
                              }}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Button
                        className="w-full"
                        onClick={() => handleConceptComplete(selectedConcept.id)}
                      >
                        Mark as Complete
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Story;