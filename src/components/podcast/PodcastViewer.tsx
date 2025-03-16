
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGeneratePodcast } from "@/hooks/useGeneratePodcast";
import { Check, FileAudio, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { useParams } from "react-router-dom";

export default function PodcastViewer() {
  const { lectureId, courseId } = useParams();
  const { generatePodcast, podcast, isLoading } = useGeneratePodcast();
  const [activeTab, setActiveTab] = useState("full");

  useEffect(() => {
    if (lectureId && !podcast && !isLoading) {
      generatePodcast(lectureId);
    }
  }, [lectureId, generatePodcast, podcast, isLoading]);

  const handleRegenerateClick = () => {
    if (lectureId) {
      generatePodcast(lectureId);
    }
  };

  const formatScript = (script: string) => {
    return script.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">{paragraph}</p>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <Loader2 className="h-16 w-16 text-purple-500 animate-spin mb-4" />
        <h3 className="text-xl font-semibold mb-2">Generating Podcast Script</h3>
        <p className="text-gray-500 text-center max-w-md">
          We're creating an engaging conversation about this lecture. This may take a minute or two...
        </p>
      </div>
    );
  }

  if (!podcast) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <FileAudio className="h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Podcast Available</h3>
        <p className="text-gray-500 text-center max-w-md mb-4">
          No podcast has been generated for this lecture yet.
        </p>
        <Button 
          onClick={() => lectureId && generatePodcast(lectureId)} 
          className="bg-purple-600 hover:bg-purple-700"
        >
          Generate Podcast
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start mb-6">
        <div>
          <h2 className="text-3xl font-bold">Lecture Podcast</h2>
          <p className="text-gray-500 mt-1">
            An educational conversation based on the lecture content
          </p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            onClick={handleRegenerateClick}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <PlayCircle className="mr-2 h-4 w-4" />
            Listen (Coming Soon)
          </Button>
        </div>
      </div>

      <Card className="shadow-lg border-2 border-purple-100">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full border-b bg-transparent space-x-4 px-4">
            <TabsTrigger value="full" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              Full Conversation
            </TabsTrigger>
            <TabsTrigger value="host" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              Host Script
            </TabsTrigger>
            <TabsTrigger value="expert" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              Expert Script
            </TabsTrigger>
            <TabsTrigger value="student" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-500">
              Student Script
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[60vh] md:h-[65vh]">
            <TabsContent value="full" className="p-6">
              <div className="prose prose-purple max-w-none">
                {formatScript(podcast.full_script)}
              </div>
            </TabsContent>
            
            <TabsContent value="host" className="p-6">
              <div className="prose prose-purple max-w-none">
                <div className="mb-4 inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Check className="mr-1 h-4 w-4" /> Host Script
                </div>
                {formatScript(podcast.host_script)}
              </div>
            </TabsContent>
            
            <TabsContent value="expert" className="p-6">
              <div className="prose prose-purple max-w-none">
                <div className="mb-4 inline-flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Check className="mr-1 h-4 w-4" /> Expert Script
                </div>
                {formatScript(podcast.expert_script)}
              </div>
            </TabsContent>
            
            <TabsContent value="student" className="p-6">
              <div className="prose prose-purple max-w-none">
                <div className="mb-4 inline-flex items-center bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                  <Check className="mr-1 h-4 w-4" /> Student Script
                </div>
                {formatScript(podcast.student_script)}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </Card>
    </div>
  );
}
