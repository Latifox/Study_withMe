
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, RefreshCw, Headphones, Mic, User, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface PodcastData {
  id: number;
  lecture_id: number;
  full_script: string;
  host_script: string;
  expert_script: string;
  student_script: string;
  is_processed: boolean;
}

const Podcast = () => {
  const { courseId, lectureId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (lectureId) {
      fetchPodcast();
    }
  }, [lectureId]);

  const fetchPodcast = async () => {
    if (!lectureId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lecture_podcast')
        .select('*')
        .eq('lecture_id', lectureId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPodcast(data);
      }
    } catch (error) {
      console.error('Error fetching podcast:', error);
      toast({
        title: "Error",
        description: "Failed to fetch podcast data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generatePodcast = async () => {
    if (!lectureId) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-podcast-conversation', {
        body: { lectureId: Number(lectureId) },
      });

      if (error) throw error;
      
      if (data?.podcast) {
        setPodcast(data.podcast);
        toast({
          title: "Success",
          description: data.message || "Podcast generated successfully",
        });
      }
    } catch (error) {
      console.error('Error generating podcast:', error);
      toast({
        title: "Error",
        description: "Failed to generate podcast",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatScript = (script: string) => {
    return script.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">{paragraph}</p>
    ));
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link to={`/course/${courseId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Course
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Lecture Podcast</h1>
        </div>
        {!isGenerating && !podcast && (
          <Button onClick={generatePodcast}>
            <Headphones className="w-4 h-4 mr-2" />
            Generate Podcast
          </Button>
        )}
        {!isGenerating && podcast && (
          <Button onClick={generatePodcast} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Podcast
          </Button>
        )}
      </div>

      {isGenerating && (
        <Card className="p-6 mb-6">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin mb-4">
              <RefreshCw className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generating Podcast</h3>
            <p className="text-gray-500">
              This might take a minute. We're creating a conversational podcast from your lecture content.
            </p>
          </div>
        </Card>
      )}

      {isLoading && !isGenerating && (
        <Card className="p-6 mb-6">
          <div className="flex justify-center py-12">
            <div className="animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
          </div>
        </Card>
      )}

      {!isLoading && !isGenerating && podcast && (
        <Tabs defaultValue="full" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="full" className="flex items-center gap-1">
              <Headphones className="w-4 h-4" />
              Full Conversation
            </TabsTrigger>
            <TabsTrigger value="host" className="flex items-center gap-1">
              <Mic className="w-4 h-4" />
              Host Script
            </TabsTrigger>
            <TabsTrigger value="expert" className="flex items-center gap-1">
              <UserCheck className="w-4 h-4" />
              Expert Script
            </TabsTrigger>
            <TabsTrigger value="student" className="flex items-center gap-1">
              <User className="w-4 h-4" />
              Student Script
            </TabsTrigger>
          </TabsList>

          <TabsContent value="full">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Complete Podcast Script</h2>
              <Separator className="mb-4" />
              <div className="whitespace-pre-line">
                {podcast.full_script}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="host">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Host Script</h2>
              <Separator className="mb-4" />
              <div className="prose max-w-none">
                {formatScript(podcast.host_script)}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="expert">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Expert Script</h2>
              <Separator className="mb-4" />
              <div className="prose max-w-none">
                {formatScript(podcast.expert_script)}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="student">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Student Script</h2>
              <Separator className="mb-4" />
              <div className="prose max-w-none">
                {formatScript(podcast.student_script)}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!isLoading && !isGenerating && !podcast && (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Headphones className="w-12 h-12 mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No Podcast Available</h3>
            <p className="text-gray-500 max-w-md mb-6">
              This lecture doesn't have a podcast yet. Generate a podcast to transform this lecture into an engaging conversation.
            </p>
            <Button onClick={generatePodcast}>
              <Headphones className="w-4 h-4 mr-2" />
              Generate Podcast
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Podcast;
