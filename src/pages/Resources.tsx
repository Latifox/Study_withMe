
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Youtube, FileText, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import BackgroundGradient from "@/components/ui/BackgroundGradient";
import ResourcesLoading from "@/components/ResourcesLoading";
import { useToast } from "@/hooks/use-toast";

interface Resource {
  type: 'video' | 'article' | 'research';
  title: string;
  url: string;
  description: string;
}

interface ConceptResources {
  concept: string;
  resources: Resource[];
}

const Resources = () => {
  const { courseId, lectureId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: lecture } = useQuery({
    queryKey: ['lecture', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', parseInt(lectureId as string))
        .single();
      
      if (error) {
        console.error('Error fetching lecture:', error);
        toast({
          title: "Error",
          description: "Failed to fetch lecture content. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
      return data;
    }
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ['lecture-resources', lectureId],
    queryFn: async () => {
      console.log('Fetching resources for lecture content:', lecture?.content?.substring(0, 100));
      
      const { data, error } = await supabase.functions.invoke('generate-resources', {
        body: { lectureContent: lecture?.content },
      });
      
      if (error) {
        console.error('Error generating resources:', error);
        toast({
          title: "Error",
          description: "Failed to generate resources. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from generate-resources');
      }
      
      return data;
    },
    enabled: !!lecture?.content,
  });

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

            {resources?.map((conceptResource: ConceptResources) => (
              <Card key={conceptResource.concept} className="mb-6 group hover:shadow-2xl transition-all duration-300 bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader>
                  <CardTitle className="text-black">{conceptResource.concept}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="video" className="w-full">
                    <TabsList className="bg-white/10">
                      <TabsTrigger 
                        value="video" 
                        className="data-[state=active]:bg-white/40 data-[state=active]:border-2 text-black border border-black transition-all duration-200"
                      >
                        Videos
                      </TabsTrigger>
                      <TabsTrigger 
                        value="article" 
                        className="data-[state=active]:bg-white/40 data-[state=active]:border-2 text-black border border-black transition-all duration-200"
                      >
                        Articles
                      </TabsTrigger>
                      <TabsTrigger 
                        value="research" 
                        className="data-[state=active]:bg-white/40 data-[state=active]:border-2 text-black border border-black transition-all duration-200"
                      >
                        Research
                      </TabsTrigger>
                    </TabsList>
                    {['video', 'article', 'research'].map((type) => (
                      <TabsContent key={type} value={type}>
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4">
                            {conceptResource.resources
                              .filter((resource) => resource.type === type)
                              .map((resource, index) => (
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
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </BackgroundGradient>
    </div>
  );
};

export default Resources;
