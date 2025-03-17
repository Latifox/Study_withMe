import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, RefreshCw, Headphones, Mic, User, Play, Pause, VolumeX, Volume2, Download, SkipBack, SkipForward } from "lucide-react";
import PodcastBackground from "@/components/ui/PodcastBackground";

interface PodcastData {
  id: number;
  lecture_id: number;
  full_script: string;
  host_script: string;
  expert_script: string;
  student_script: string;
  is_processed: boolean;
  audio_url?: string;
  job_id?: string;
}

interface WondercraftPodcastResponse {
  id?: string;
  job_id?: string;
  status?: string;
  episode_url?: string;
  url?: string;
  state?: string;
  progress?: number;
  finished?: boolean;
  error?: boolean;
  message?: string;
}

const HOST_VOICE_ID = "1da32dae-a953-4e5f-81df-94e4bb1965e5";
const GUEST_VOICE_ID = "0b356f1c-03d6-4e80-9427-9e26e7e2d97a";
const MUSIC_ID = "168bab40-3ead-4699-80a4-c97a7d613e3e";

const Podcast = () => {
  const {
    courseId,
    lectureId
  } = useParams();
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
  const [isPollingSatus, setIsPollingSatus] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const {
    toast
  } = useToast();

  useEffect(() => {
    if (lectureId) {
      fetchPodcast();
    }
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [lectureId]);

  const fetchPodcast = async () => {
    if (!lectureId) return;
    setIsLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('lecture_podcast').select('*').eq('lecture_id', parseInt(lectureId)).single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (data) {
        setPodcast(data);
        if (data.is_processed && data.audio_url) {
          console.log('Podcast has an existing audio URL:', data.audio_url);
          setPodcastAudio({
            url: data.audio_url,
            finished: true,
            progress: 100
          });
          if (audioRef.current) {
            audioRef.current.src = data.audio_url;
            audioRef.current.volume = isMuted ? 0 : volume;
          }
        } else if (data.job_id && !data.is_processed) {
          console.log('Podcast has a job ID but is not processed yet. Starting polling:', data.job_id);
          startPollingJobStatus(data.job_id);
        }
      }
    } catch (error) {
      console.error('Error fetching podcast:', error);
      toast({
        title: "Error",
        description: "Failed to fetch podcast data",
        variant: "destructive"
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
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-podcast-conversation', {
        body: {
          lectureId: parseInt(lectureId)
        }
      });
      if (error) throw error;
      if (data?.podcast) {
        setPodcast(data.podcast);
        toast({
          title: "Success",
          description: data.message || "Podcast generated successfully"
        });
      }
    } catch (error) {
      console.error('Error generating podcast:', error);
      toast({
        title: "Error",
        description: "Failed to generate podcast",
        variant: "destructive"
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
      const {
        data,
        error
      } = await supabase.functions.invoke('elevenlabs-podcast', {
        body: {
          script: podcast.full_script,
          hostVoiceId: HOST_VOICE_ID,
          guestVoiceId: GUEST_VOICE_ID,
          musicId: MUSIC_ID,
          lectureId: parseInt(lectureId!) // Pass the lecture ID to the edge function
        }
      });
      if (error) {
        console.error('Error response from wondercraft-podcast function:', error);
        throw error;
      }
      console.log('Response from wondercraft-podcast function:', data);
      if (data?.podcastData) {
        setPodcastAudio(data.podcastData);
        const jobId = data.podcastData.job_id || data.podcastData.id;
        if (jobId) {
          toast({
            title: "Processing",
            description: "Your podcast is being generated. We'll update you when it's ready."
          });
          startPollingJobStatus(jobId);
        }
      }
    } catch (error) {
      console.error('Error generating podcast audio:', error);
      toast({
        title: "Error",
        description: "Failed to generate podcast audio",
        variant: "destructive"
      });
      setIsGeneratingAudio(false);
    }
  };

  const startPollingJobStatus = (jobId: string) => {
    setIsPollingSatus(true);
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }
    let failedAttempts = 0;
    const maxFailedAttempts = 5;
    const intervalId = window.setInterval(async () => {
      try {
        console.log('Polling job status for job ID:', jobId);
        const {
          data,
          error
        } = await supabase.functions.invoke('elevenlabs-podcast', {
          body: {
            jobId,
            lectureId: parseInt(lectureId!) // Pass the lecture ID for database updates
          }
        });
        if (error) {
          console.error('Error polling job status:', error);
          failedAttempts++;
          if (failedAttempts >= maxFailedAttempts) {
            throw new Error(`Failed to check podcast status after ${maxFailedAttempts} attempts`);
          }
          return; // Continue polling even if this attempt failed
        }
        failedAttempts = 0;
        console.log('Status polling response:', data);
        if (data?.podcastData) {
          setPodcastAudio(data.podcastData);
          const finished = data.podcastData.finished;
          const status = data.podcastData.status || data.podcastData.state;
          const audioUrl = data.podcastData.url || data.podcastData.episode_url;
          const error = data.podcastData.error;
          const errorMessage = data.podcastData.message;
          if ((finished === true || status === 'completed' || status === 'ready') && audioUrl) {
            setIsPollingSatus(false);
            setIsGeneratingAudio(false);
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.volume = isMuted ? 0 : volume;
            }
            fetchPodcast();
            window.clearInterval(pollIntervalRef.current!);
            pollIntervalRef.current = null;
            toast({
              title: "Success",
              description: "Podcast audio is ready to play"
            });
          } else if (error === true || status === 'failed') {
            throw new Error(errorMessage || 'Podcast generation failed');
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        toast({
          title: "Error",
          description: "Failed to check podcast status",
          variant: "destructive"
        });
        window.clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        setIsPollingSatus(false);
        setIsGeneratingAudio(false);
      }
    }, 8000);
    pollIntervalRef.current = intervalId;
  };

  const playTextToSpeech = async (text: string) => {
    if (!text) return;
    setIsAudioLoading(true);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voiceId: activeTab === "host" ? HOST_VOICE_ID : GUEST_VOICE_ID
        }
      });
      if (error) throw error;
      if (data?.audioContent) {
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: 'audio/mp3'
        });
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
        variant: "destructive"
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
    return script.split('\n\n').map((paragraph, index) => <p key={index} className="mb-4">{paragraph}</p>);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const downloadPodcast = () => {
    if (podcast?.audio_url) {
      const link = document.createElement('a');
      link.href = podcast.audio_url;
      link.download = 'podcast.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    const downloadUrl = podcastAudio?.url || podcastAudio?.episode_url;
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'podcast.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const calculateProgress = () => {
    if (!podcastAudio) return 0;
    return podcastAudio.progress || 0;
  };

  const hasPodcastAudio = () => {
    return podcast?.is_processed && podcast?.audio_url || podcastAudio && (podcastAudio.url || podcastAudio.episode_url);
  };

  useEffect(() => {
    const updateTime = () => {
      if (audioRef.current && !isDraggingTime) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    }
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('timeupdate', updateTime);
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      }
    };
  }, [isDraggingTime]);

  const handleTimeChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSeekBackward = () => {
    if (audioRef.current) {
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeekForward = () => {
    if (audioRef.current) {
      const newTime = Math.min(duration, audioRef.current.currentTime + 10);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
  };

  return <PodcastBackground>
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link to={`/course/${courseId}`}>
              <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm border border-white/50 hover:bg-white/90">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Podcast</h1>
          </div>
          {!isGenerating && !podcast && <Button onClick={generatePodcast} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md">
              <Headphones className="w-4 h-4 mr-2" />
              Generate Podcast
            </Button>}
          {!isGenerating && podcast && <div className="flex gap-2">
              {!hasPodcastAudio() && <Button onClick={generateAudio} disabled={isGeneratingAudio || isPollingSatus} variant="default" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md">
                  {isGeneratingAudio || isPollingSatus ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Headphones className="w-4 h-4 mr-2" />}
                  Generate Audio
                </Button>}
            </div>}
        </div>

        <div className="hidden">
          <audio ref={audioRef} onEnded={handleAudioEnded} controls className="w-full mb-4" onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} />
        </div>

        {isGenerating && <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-800">Generating Podcast</h3>
              <p className="text-gray-600">
                This might take a minute. We're creating a conversational podcast from your lecture content.
              </p>
            </div>
          </Card>}

        {isLoading && !isGenerating && <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg">
            <div className="flex justify-center py-12">
              <div className="animate-spin">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>}

        {!isLoading && !isGenerating && podcast && <>
            {isPollingSatus && <Card className="p-4 mb-4 bg-white/80 backdrop-blur-sm border border-white/50 shadow-md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">Generating podcast audio...</p>
                    <span className="text-sm text-gray-500">{Math.round(calculateProgress())}%</span>
                  </div>
                  <Progress value={calculateProgress()} className="h-2 bg-blue-100" />
                  <p className="text-xs text-gray-500">This may take a few minutes. Please wait while we create your audio.</p>
                </div>
              </Card>}

            {hasPodcastAudio() && 
              <Card className="p-6 mb-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-sm border border-indigo-200/50 shadow-lg rounded-2xl overflow-hidden">
                <div className="relative">
                  <div className="relative z-10 flex flex-col space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <Headphones className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800">Lecture Podcast</h3>
                          <p className="text-sm text-gray-600">
                            {formatTime(duration)} minute{duration > 60 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <Button variant="outline" onClick={downloadPodcast} className="bg-white/70 hover:bg-white border-indigo-200 text-indigo-700 hover:text-indigo-800 flex items-center gap-2 transition-all hover:shadow-md">
                        <Download className="w-4 h-4" />
                        Download Podcast
                      </Button>
                    </div>
                    
                    <div className="flex flex-col space-y-4">
                      <div className="flex items-center justify-center space-x-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleSeekBackward} 
                          className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 transition-all"
                        >
                          <SkipBack className="h-6 w-6" />
                        </Button>
                        
                        <Button 
                          onClick={togglePlayPause} 
                          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-md ${isPlaying 
                            ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
                            : 'bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'}`}
                        >
                          {isPlaying 
                            ? <Pause className="h-6 w-6 text-white" /> 
                            : <Play className="h-6 w-6 text-white translate-x-0.5" />}
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={handleSeekForward} 
                          className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 transition-all"
                        >
                          <SkipForward className="h-6 w-6" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="relative h-2 group">
                          <Slider 
                            value={[currentTime]} 
                            min={0} 
                            max={duration || 100} 
                            step={0.1} 
                            onValueChange={handleTimeChange} 
                            onValueCommit={() => setIsDraggingTime(false)} 
                            onMouseDown={() => setIsDraggingTime(true)} 
                            onMouseUp={() => setIsDraggingTime(false)}
                            className="h-2"
                          />
                          <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full pointer-events-none" 
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={toggleMute} 
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 transition-all"
                        >
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <div className="w-24">
                          <Slider
                            value={[volume]}
                            min={0}
                            max={1}
                            step={0.01}
                            onValueChange={handleVolumeChange}
                            className="h-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            }

            <Tabs defaultValue="full" className="w-full" onValueChange={handleTabChange}>
              <TabsList className="mb-4 bg-white/50 backdrop-blur-sm p-1 rounded-lg border border-white/50">
                <TabsTrigger value="full" className="flex items-center gap-1 data-[state=active]:bg-white data-[state=active]:text-blue-700">
                  <Headphones className="w-4 h-4" />
                  Full Conversation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="full">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border border-white/50 shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Complete Podcast Script</h2>
                    {!podcastAudio && <Button size="sm" onClick={() => playTextToSpeech(podcast.host_script)} disabled={isAudioLoading} className="bg-blue-500 hover:bg-blue-600 text-white">
                        {isAudioLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        Listen to Host
                      </Button>}
                  </div>
                  <Separator className="mb-4" />
                  <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                    {podcast.full_script}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="host">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border border-white/50 shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Host Script</h2>
                    {!podcastAudio && <Button size="sm" onClick={() => playTextToSpeech(podcast.host_script)} disabled={isAudioLoading} className="bg-blue-500 hover:bg-blue-600 text-white">
                        {isAudioLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        Listen
                      </Button>}
                  </div>
                  <Separator className="mb-4" />
                  <div className="prose max-w-none text-gray-700">
                    {formatScript(podcast.host_script)}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="guest">
                <Card className="p-6 bg-white/80 backdrop-blur-sm border border-white/50 shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Guest Script</h2>
                    {!podcastAudio && <Button size="sm" onClick={() => playTextToSpeech(podcast.expert_script)} disabled={isAudioLoading} className="bg-blue-500 hover:bg-blue-600 text-white">
                        {isAudioLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        Listen
                      </Button>}
                  </div>
                  <Separator className="mb-4" />
                  <div className="prose max-w-none text-gray-700">
                    {formatScript(podcast.expert_script)}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </>}

        {!isLoading && !isGenerating && !podcast && <Card className="p-6 bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Headphones className="w-12 h-12 mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2 text-gray-800">No Podcast Available</h3>
              <p className="text-gray-600 max-w-md mb-6">
                This lecture doesn't have a podcast yet. Generate a podcast to transform this lecture into an engaging conversation.
              </p>
              <Button onClick={generatePodcast} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md">
                <Headphones className="w-4 h-4 mr-2" />
                Generate Podcast
              </Button>
            </div>
          </Card>}
      </div>
    </PodcastBackground>;
};

export default Podcast;
