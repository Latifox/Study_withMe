
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

interface Resource {
  type: 'video' | 'article' | 'research';
  title: string;
  url: string;
  description: string;
}

const Resources = () => {
  const { courseId, lectureId, segmentId } = useParams();
  const navigate = useNavigate();

  console.log('Resources page params:', { courseId, lectureId, segmentId });

  const { data: segmentContent, isLoading, error } = useSegmentContent(
    lectureId ? parseInt(lectureId) : null,
    segmentId ? parseInt(segmentId) : null
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

  if (isLoading) {
    return <ResourcesLoading />;
  }

  if (error) {
    console.error('Error loading resources:', error);
  }

  if (!segmentContent?.segments[0]?.resources) {
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
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6">
                  <p className="text-center text-black/80">No resources available for this segment yet.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </BackgroundGradient>
      </div>
    );
  }

  const { resources } = segmentContent.segments[0];
  const resourceTypes: Array<'video' | 'article' | 'research'> = ['video', 'article', 'research'];

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

            <Card className="mb-6 group hover:shadow-2xl transition-all duration-300 bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-black">Additional Learning Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="video" className="w-full">
                  <TabsList className="bg-white/10">
                    {resourceTypes.map(type => (
                      <TabsTrigger 
                        key={type}
                        value={type} 
                        className="data-[state=active]:bg-white/40 data-[state=active]:border-2 text-black border border-black transition-all duration-200"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}s
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {resourceTypes.map(type => (
                    <TabsContent key={type} value={type}>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {(resources[type] || []).map((resource: Resource, index: number) => (
                            <Card key={index} className="group hover:shadow-lg transition-all duration-300 bg-white/5 backdrop-blur-sm border-white/10">
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  <div className="mt-1 p-2 bg-white/10 rounded-full">
                                    {getResourceIcon(type)}
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
                          {(!resources[type] || resources[type].length === 0) && (
                            <p className="text-center text-black/60 py-4">
                              No {type} resources available for this segment.
                            </p>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </BackgroundGradient>
    </div>
  );
};

export default Resources;

