import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Youtube, FileText, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

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

  const { data: lecture } = useQuery({
    queryKey: ['lecture', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('id', parseInt(lectureId as string))
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ['lecture-resources', lectureId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-resources', {
        body: { lectureContent: lecture?.content },
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!lecture?.content,
  });

  const getResourceIcon = (type: Resource['type']) => {
    switch (type) {
      case 'video':
        return <Youtube className="w-4 h-4" />;
      case 'article':
        return <FileText className="w-4 h-4" />;
      case 'research':
        return <GraduationCap className="w-4 h-4" />;
    }
  };

  return (
    <BackgroundGradient>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => navigate(`/course/${courseId}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Course
            </Button>
            <h1 className="text-4xl font-bold text-gray-800">
              Additional Resources
            </h1>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-8 w-[250px]" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-[200px]" />
                      <div className="space-y-3">
                        {[1, 2, 3].map((j) => (
                          <Skeleton key={j} className="h-[100px] w-full" />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : resources?.map((conceptResource: ConceptResources) => (
            <Card key={conceptResource.concept} className="mb-6">
              <CardHeader>
                <CardTitle>{conceptResource.concept}</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="video" className="w-full">
                  <TabsList>
                    <TabsTrigger value="video">Videos</TabsTrigger>
                    <TabsTrigger value="article">Articles</TabsTrigger>
                    <TabsTrigger value="research">Research</TabsTrigger>
                  </TabsList>
                  {['video', 'article', 'research'].map((type) => (
                    <TabsContent key={type} value={type}>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {conceptResource.resources
                            .filter((resource) => resource.type === type)
                            .map((resource, index) => (
                              <Card key={index}>
                                <CardContent className="p-4">
                                  <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                      {getResourceIcon(resource.type)}
                                    </div>
                                    <div>
                                      <h3 className="font-semibold mb-2">
                                        <a
                                          href={resource.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          {resource.title}
                                        </a>
                                      </h3>
                                      <p className="text-gray-600">
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
  );
};

export default Resources;
