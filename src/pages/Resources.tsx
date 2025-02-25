
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Youtube, FileText, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import ResourcesLoading from "@/components/ResourcesLoading";
import { useSegmentContent } from "@/hooks/useSegmentContent";
import { toast } from "@/components/ui/use-toast";

interface Resource {
  type: 'video' | 'article' | 'research';
  title: string;
  url: string;
  description: string;
}

const Resources = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();

  console.log('Resources page params:', { courseId, lectureId });

  // Parse the lecture ID from URL params
  const numericLectureId = lectureId ? parseInt(lectureId) : null;

  const { data: segmentContent, isLoading, error } = useSegmentContent(
    numericLectureId,
    1 // We always use segment 1 as default since segments are just for LLM guidance
  );

  console.log('Segment content result:', { data: segmentContent, isLoading, error });

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'video':
        return <Youtube className="w-4 h-4 text-black" />;
      case 'article':
        return <FileText className="w-4 h-4 text-black" />;
      case 'research':
        return <GraduationCap className="w-4 h-4 text-black" />;
    }
  };

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
            </div>

            {isLoading ? (
              <ResourcesLoading />
            ) : !segmentContent?.segments[0]?.resources ? (
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6">
                  <p className="text-center text-black/80">
                    Generating resources for this lecture...
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6 group hover:shadow-2xl transition-all duration-300 bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-black">Additional Learning Resources</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="video" className="w-full">
                    <TabsList className="bg-white/10">
                      {['video', 'article', 'research'].map(type => (
                        <TabsTrigger 
                          key={type}
                          value={type} 
                          className="data-[state=active]:bg-white/40 data-[state=active]:border-2 text-black border border-black transition-all duration-200"
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}s
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {['video', 'article', 'research'].map(type => (
                      <TabsContent key={type} value={type}>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4">
                            {(segmentContent.segments[0].resources[type] || []).map((resource: Resource, index: number) => (
                              <Card key={index} className="group hover:shadow-lg transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10">
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-white/10 rounded-full">
                                      {getResourceIcon(resource.type)}
                                    </div>
                                    <div>
                                      <h3 className="font-semibold mb-2">
                                        <a
                                          href={resource.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-black hover:text-black/80 transition-colors"
                                        >
                                          {resource.title}
                                        </a>
                                      </h3>
                                      <p className="text-black/80">
                                        {resource.description}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            {(!segmentContent.segments[0].resources[type] || segmentContent.segments[0].resources[type].length === 0) && (
                              <p className="text-center text-black/60 py-4">
                                No {type} resources available.
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </BackgroundGradient>
    </div>
  );
};

export default Resources;
