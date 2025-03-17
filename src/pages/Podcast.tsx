
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, RefreshCw, Headphones, Mic, User, UserCheck, Play, Pause, VolumeX, Volume2 } from "lucide-react";
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

interface TextToSpeechOptions {
  voiceId?: string;
}

const HOST_VOICE_ID = "pFZP5JQG7iQjIQuC4Bku"; // Lily
const EXPERT_VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel
const STUDENT_VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte

const Podcast = () => {
  const { courseId, lectureId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [podcast, setPodcast] = useState<PodcastData | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState("full");
  const [currentVoiceId, setCurrentVoiceId] = useState(HOST_VOICE_ID);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (lectureId) {
      fetchPodcast();
    }
  }, [lectureId]);

  useEffect(() => {
    // Update voice ID based on active tab
    if (activeTab === "host") {
      setCurrentVoiceId(HOST_VOICE_ID);
    } else if (activeTab === "expert") {
      setCurrentVoiceId(EXPERT_VOICE_ID);
    } else if (activeTab === "student") {
      setCurrentVoiceId(STUDENT_VOICE_ID);
    } else {
      setCurrentVoiceId(HOST_VOICE_ID);
    }
  }, [activeTab]);

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

  const playTextToSpeech = async (text: string, options?: TextToSpeechOptions) => {
    if (!text) return;
    
    setIsAudioLoading(true);
    setIsPlaying(false);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    try {
      // Get the voice ID to use
      const voiceId = options?.voiceId || currentVoiceId;
      
      // Call the text-to-speech function
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { 
          text, 
          voiceId 
        },
      });

      if (error) throw error;
      
      if (data?.audioContent) {
        // Convert base64 audio to a blob
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        
        // Play the audio
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
    
    // Stop any currently playing audio when changing tabs
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

  // Handle audio ended event
  const handleAudioEnded = () => {
    setIsPlaying(false);
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

      {/* Hidden audio element for TTS playback */}
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded}
        className="hidden"
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
          {/* Audio controls */}
          <Card className="p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={togglePlayPause} 
                disabled={isAudioLoading}
                className="mr-2"
              >
                {isAudioLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
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
                {isAudioLoading ? "Loading audio..." : isPlaying ? "Playing" : "Ready to play"}
              </span>
            </div>
            
            <div className="text-sm text-gray-500">
              {activeTab === "host" ? "Host Voice" : activeTab === "expert" ? "Expert Voice" : activeTab === "student" ? "Student Voice" : "Host Voice"}
            </div>
          </Card>

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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Complete Podcast Script</h2>
                  <Button 
                    size="sm" 
                    onClick={() => playTextToSpeech(podcast.host_script, { voiceId: HOST_VOICE_ID })}
                    disabled={isAudioLoading}
                  >
                    {isAudioLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Listen to Host
                  </Button>
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
                  <Button 
                    size="sm" 
                    onClick={() => playTextToSpeech(podcast.host_script, { voiceId: HOST_VOICE_ID })}
                    disabled={isAudioLoading}
                  >
                    {isAudioLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Listen
                  </Button>
                </div>
                <Separator className="mb-4" />
                <div className="prose max-w-none">
                  {formatScript(podcast.host_script)}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="expert">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Expert Script</h2>
                  <Button 
                    size="sm" 
                    onClick={() => playTextToSpeech(podcast.expert_script, { voiceId: EXPERT_VOICE_ID })}
                    disabled={isAudioLoading}
                  >
                    {isAudioLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Listen
                  </Button>
                </div>
                <Separator className="mb-4" />
                <div className="prose max-w-none">
                  {formatScript(podcast.expert_script)}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="student">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Student Script</h2>
                  <Button 
                    size="sm" 
                    onClick={() => playTextToSpeech(podcast.student_script, { voiceId: STUDENT_VOICE_ID })}
                    disabled={isAudioLoading}
                  >
                    {isAudioLoading ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Listen
                  </Button>
                </div>
                <Separator className="mb-4" />
                <div className="prose max-w-none">
                  {formatScript(podcast.student_script)}
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
