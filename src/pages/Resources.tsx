import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Youtube, FileText, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
        .eq('id', lectureId)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ['lecture-resources', lectureId],
    queryFn: async () => {
      const response = await fetch(`/api/generate-resources`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lectureContent: lecture?.content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }

      return response.json();
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
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
          <div className="text-center py-8">Loading resources...</div>
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
  );
};

export default Resources;