
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import ResourcesLoading from "@/components/ResourcesLoading";
import { useSegmentContent } from "@/hooks/useSegmentContent";
import { toast } from "@/components/ui/use-toast";
import ReactMarkdown from 'react-markdown';

const Resources = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();

  console.log('Resources page params:', { courseId, lectureId });

  // Parse the lecture ID from URL params
  const numericLectureId = lectureId ? parseInt(lectureId) : null;

  const { data: segmentContent, isLoading, error } = useSegmentContent(numericLectureId);

  console.log('Segment content result:', { data: segmentContent, isLoading, error });

  if (error) {
    console.error('Error loading resources:', error);
    toast({
      title: "Error loading resources",
      description: "Please try again later",
      variant: "destructive",
    });
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundGradient>
        <div className="relative p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Button
                variant="ghost"
                onClick={() => navigate(`/course/${courseId}`)}
                className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-black text-black"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Lectures
              </Button>
              <h1 className="text-2xl font-bold text-black flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Additional Resources
              </h1>
            </div>

            {isLoading ? (
              <ResourcesLoading />
            ) : !segmentContent?.segments ? (
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6">
                  <p className="text-center text-black/80">
                    Generating resources for this lecture...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {segmentContent.segments.map((segment) => (
                  <Card 
                    key={segment.id} 
                    className="mb-6 transition-all duration-300 bg-white/10 backdrop-blur-md border-white/20 hover:shadow-xl hover:bg-white/20"
                  >
                    <CardHeader>
                      <CardTitle className="text-xl text-black flex items-center gap-2">
                        Resources for: {segment.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] px-4">
                        <div className="prose prose-lg prose-slate max-w-none">
                          <ReactMarkdown 
                            components={{
                              h2: ({ children }) => (
                                <h2 className="text-lg font-semibold text-black/80 border-b border-black/10 pb-2 mb-4">
                                  {children}
                                </h2>
                              ),
                              a: ({ children, href }) => (
                                <a 
                                  href={href} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 transition-colors no-underline hover:underline"
                                >
                                  {children}
                                </a>
                              ),
                              li: ({ children }) => (
                                <li className="mb-4 text-black/80">
                                  {children}
                                </li>
                              )
                            }}
                          >
                            {segment.content}
                          </ReactMarkdown>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </BackgroundGradient>
    </div>
  );
};

export default Resources;
