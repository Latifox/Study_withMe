
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, RefreshCw, Headphones, Mic, User, Play, Pause, VolumeX, Volume2, Download } from "lucide-react";
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

interface WondercraftPodcastResponse {
  id: string;
  status: string;
  episode_url?: string;
  url?: string;
  state?: string;
}

const HOST_VOICE_ID = "1da32dae-a953-4e5f-81df-94e4bb1965e5"; // Updated custom voice ID
const GUEST_VOICE_ID = "0b356f1c-03d6-4e80-9427-9e26e7e2d97a"; // Updated custom voice ID
const MUSIC_ID = "168bab40-3ead-4699-80a4-c97a7d613e3e"; // Specific music ID

const Podcast = () => {
  const { courseId, lectureId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [podcastAudio, setPodcastAudio] = useState<WondercraftPodcastResponse | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("full");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
        .eq('lecture_id', parseInt(lectureId))
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
      console.log('Generating podcast for lecture ID:', lectureId);
      const { data, error } = await supabase.functions.invoke('generate-podcast-conversation', {
        body: { lectureId: parseInt(lectureId) },
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

  const generateAudio = async () => {
    if (!podcast) return;
    
    setIsGeneratingAudio(true);
    try {
      console.log('Generating audio for podcast with script length:', podcast.full_script.length);
      console.log('Calling wondercraft-podcast function with host voice ID:', HOST_VOICE_ID, 'and guest voice ID:', GUEST_VOICE_ID);
      
      const { data, error } = await supabase.functions.invoke('elevenlabs-podcast', {
        body: { 
          script: podcast.full_script, // Using full_script with HOST: and GUEST: prefixes intact
          hostVoiceId: HOST_VOICE_ID,
          guestVoiceId: GUEST_VOICE_ID,
          musicId: MUSIC_ID
        },
      });

      if (error) {
        console.error('Error response from wondercraft-podcast function:', error);
        throw error;
      }
      
      console.log('Response from wondercraft-podcast function:', data);
      
      if (data?.podcastData) {
        setPodcastAudio(data.podcastData);
        
        // Get the audio URL, checking both possible properties
        const audioUrl = data.podcastData.episode_url || data.podcastData.url;
        
        if (audioUrl) {
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.volume = isMuted ? 0 : volume;
          }
          
          toast({
            title: "Success",
            description: "Podcast audio generated successfully",
          });
        } else if (data.podcastData.state === 'processing') {
          toast({
            title: "Processing",
            description: "Your podcast is being generated. Please check back in a few minutes.",
          });
        }
      }
    } catch (error) {
      console.error('Error generating podcast audio:', error);
      toast({
        title: "Error",
        description: "Failed to generate podcast audio",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const playTextToSpeech = async (text: string) => {
    if (!text) return;
    
    setIsAudioLoading(true);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text, 
          voiceId: activeTab === "host" ? HOST_VOICE_ID : GUEST_VOICE_ID 
        },
      });

      if (error) throw error;
      
      if (data?.audioContent) {
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.volume = isMuted ? 0 : volume;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error with text-to-speech:', error);
      toast({
        title: "Error",
        description: "Failed to convert text to speech",
        variant: "destructive",
      });
    } finally {
      setIsAudioLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const formatScript = (script: string) => {
    return script.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-4">{paragraph}</p>
    ));
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const downloadPodcast = () => {
    // Get the audio URL, checking both possible properties
    const downloadUrl = podcastAudio?.episode_url || podcastAudio?.url;
    
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'podcast.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
          <div className="flex gap-2">
            <Button onClick={generatePodcast} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Script
            </Button>
            <Button 
              onClick={generateAudio} 
              disabled={isGeneratingAudio}
              variant="default"
            >
              {isGeneratingAudio ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Headphones className="w-4 h-4 mr-2" />
              )}
              Generate Audio
            </Button>
          </div>
        )}
      </div>

      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded}
        controls
        className="w-full mb-4"
      />

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
        <>
          {podcastAudio && (podcastAudio.episode_url || podcastAudio.url) && (
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={togglePlayPause}
                    className="mr-2"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleMute}
                    className="mr-2"
                  >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <span className="text-sm font-medium">
                    {isPlaying ? "Playing full podcast" : "Podcast ready"}
                  </span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={downloadPodcast}
                  className="flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Podcast
                </Button>
              </div>
            </Card>
          )}

          <Tabs defaultValue="full" className="w-full" onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="full" className="flex items-center gap-1">
                <Headphones className="w-4 h-4" />
                Full Conversation
              </TabsTrigger>
              <TabsTrigger value="host" className="flex items-center gap-1">
                <Mic className="w-4 h-4" />
                Host Script
              </TabsTrigger>
              <TabsTrigger value="guest" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Guest Script
              </TabsTrigger>
            </TabsList>

            <TabsContent value="full">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Complete Podcast Script</h2>
                  {!podcastAudio && (
                    <Button 
                      size="sm" 
                      onClick={() => playTextToSpeech(podcast.host_script)}
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Listen to Host
                    </Button>
                  )}
                </div>
                <Separator className="mb-4" />
                <div className="whitespace-pre-line">
                  {podcast.full_script}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="host">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Host Script</h2>
                  {!podcastAudio && (
                    <Button 
                      size="sm" 
                      onClick={() => playTextToSpeech(podcast.host_script)}
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Listen
                    </Button>
                  )}
                </div>
                <Separator className="mb-4" />
                <div className="prose max-w-none">
                  {formatScript(podcast.host_script)}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="guest">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Guest Script</h2>
                  {!podcastAudio && (
                    <Button 
                      size="sm" 
                      onClick={() => playTextToSpeech(podcast.expert_script)}
                      disabled={isAudioLoading}
                    >
                      {isAudioLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Listen
                    </Button>
                  )}
                </div>
                <Separator className="mb-4" />
                <div className="prose max-w-none">
                  {formatScript(podcast.expert_script)}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </>
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
