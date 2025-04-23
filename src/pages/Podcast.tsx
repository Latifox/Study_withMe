import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase, ensureBucketExists } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, RefreshCw, Headphones, Mic, User, Play, Pause, VolumeX, Volume2, Download, SkipBack, SkipForward, AlertCircle } from "lucide-react";
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
  stored_audio_path?: string;
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

const HOST_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const GUEST_VOICE_ID = "N2lVS1w4EtoT3dr4eOWO"; // Callum

const Podcast = () => {
  const {
    courseId,
    lectureId
  } = useParams();
  const [isLoading, setIsLoading] = useState(true);
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
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const {
    toast
  } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!lectureId) return;
      setIsLoading(true);
      setError(null);
      try {
        await fetchPodcast();
      } catch (error) {
        console.error("Error initializing podcast page:", error);
        setError("Failed to load podcast data. Please try again.");
        toast({
          title: "Error",
          description: "Failed to load podcast data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, [lectureId]);

  const fetchPodcast = async () => {
    if (!lectureId) return;
    try {
      console.log(`Fetching podcast for lecture ID: ${lectureId}`);
      const {
        data,
        error
      } = await supabase.from('lecture_podcast').select('*').eq('lecture_id', parseInt(lectureId)).maybeSingle();
      if (error) {
        console.error('Error fetching podcast from database:', error);
        throw error;
      }
      console.log('Podcast fetch response:', data);
      if (data) {
        console.log('Podcast data retrieved from database:', data);
        setPodcast(data);
        if (data.is_processed) {
          console.log('Podcast is processed, setting up audio source');
          await setupPodcastAudio(data);
        } else if (data.job_id) {
          console.log('Podcast has a job ID but is not processed yet. Starting polling:', data.job_id);
          startPollingJobStatus(data.job_id);
        }
      } else {
        console.log('No podcast found for this lecture');
        setPodcast(null);
      }
    } catch (error) {
      console.error('Error fetching podcast:', error);
      toast({
        title: "Error",
        description: "Failed to fetch podcast data",
        variant: "destructive"
      });
      throw error; // Re-throw to be caught by the outer try-catch
    }
  };

  const getAudioUrl = async (path: string): Promise<string | null> => {
    // Try audio_podcasts bucket first
    try {
      const { data: audioPodcastsUrl } = await supabase.storage
        .from('audio_podcasts')
        .getPublicUrl(path);
      
      if (audioPodcastsUrl?.publicUrl) {
        console.log('Retrieved URL from audio_podcasts bucket:', audioPodcastsUrl.publicUrl);
        return audioPodcastsUrl.publicUrl;
      }
    } catch (error) {
      console.warn('Failed to get URL from audio_podcasts bucket:', error);
    }
    
    // Try podcast_audio bucket as fallback
    try {
      const { data: podcastAudioUrl } = await supabase.storage
        .from('podcast_audio')
        .getPublicUrl(path);
      
      if (podcastAudioUrl?.publicUrl) {
        console.log('Retrieved URL from podcast_audio bucket:', podcastAudioUrl.publicUrl);
        return podcastAudioUrl.publicUrl;
      }
    } catch (error) {
      console.warn('Failed to get URL from podcast_audio bucket:', error);
    }
    
    console.error('Could not retrieve audio URL from any bucket');
    return null;
  };

  const setupPodcastAudio = async (podcastData: PodcastData) => {
    try {
      console.log('Setting up podcast audio with data:', podcastData);
      
      // First check for stored audio path
      if (podcastData.stored_audio_path) {
        console.log('Podcast has stored audio path:', podcastData.stored_audio_path);
        
        const audioUrl = await getAudioUrl(podcastData.stored_audio_path);
        
        if (audioUrl) {
          console.log('Successfully retrieved public URL for stored audio:', audioUrl);
          setPodcastAudio({
            url: audioUrl,
            finished: true,
            progress: 100
          });
          
          if (audioRef.current) {
            console.log('Setting audio source to stored audio file');
            audioRef.current.src = audioUrl;
            audioRef.current.volume = isMuted ? 0 : volume;
            audioRef.current.load();
          }
          return;
        } else {
          console.error('Failed to get public URL for stored audio path');
        }
      }
      
      // Fallback to audio_url if present
      if (podcastData.audio_url) {
        console.log('Using external audio URL as fallback:', podcastData.audio_url);
        setPodcastAudio({
          url: podcastData.audio_url,
          finished: true,
          progress: 100
        });
        
        if (audioRef.current) {
          audioRef.current.src = podcastData.audio_url;
          audioRef.current.volume = isMuted ? 0 : volume;
          audioRef.current.load();
        }
      } else {
        console.error('No audio sources available for this podcast');
      }
    } catch (storageError) {
      console.error('Error setting up podcast audio:', storageError);
      if (podcastData.audio_url) {
        console.log('Falling back to external audio URL due to error:', podcastData.audio_url);
        setPodcastAudio({
          url: podcastData.audio_url,
          finished: true,
          progress: 100
        });
        if (audioRef.current) {
          audioRef.current.src = podcastData.audio_url;
          audioRef.current.volume = isMuted ? 0 : volume;
          audioRef.current.load();
        }
      }
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

  const startPollingJobStatus = (jobId: string) => {
    setIsPollingSatus(true);
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }
    
    const interval = window.setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('lecture_podcast')
          .select('*')
          .eq('job_id', jobId)
          .single();
          
        if (error) throw error;
        
        if (data && data.is_processed) {
          window.clearInterval(interval);
          setIsPollingSatus(false);
          setPodcast(data);
          await setupPodcastAudio(data);
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        window.clearInterval(interval);
        setIsPollingSatus(false);
      }
    }, 5000);
    
    pollIntervalRef.current = interval;
  };

  const generateAudio = async () => {
    if (!podcast) return;
    setIsGeneratingAudio(true);
    try {
      console.log('Generating audio for podcast with script length:', podcast.full_script.length);
      
      const lines = podcast.full_script.split('\n');
      const parsedScript = parseScript(lines);
      
      if (parsedScript.length === 0) {
        throw new Error("Failed to parse podcast script");
      }
      
      const timestamp = new Date().getTime();
      const audioFileName = `podcast_${lectureId}_${timestamp}.mp3`;
      
      setPodcastAudio({
        progress: 5,
        finished: false,
        message: "Preparing script for processing..."
      });
      
      startPollingProgress(10);
      
      const audioBlobs = [];
      let currentProgress = 10;
      
      for (let i = 0; i < parsedScript.length; i++) {
        const segment = parsedScript[i];
        const segmentProgress = 80 / parsedScript.length;
        
        try {
          setPodcastAudio(prev => ({
            ...prev,
            progress: currentProgress,
            message: `Processing segment ${i+1} of ${parsedScript.length}...`
          }));
          
          const voiceId = segment.speaker === 'host' ? HOST_VOICE_ID : GUEST_VOICE_ID;
          
          const { data, error } = await supabase.functions.invoke('text-to-speech', {
            body: {
              text: segment.text,
              voiceId: voiceId
            }
          });
          
          if (error) throw error;
          
          if (data?.audioContent) {
            const binaryString = atob(data.audioContent);
            const bytes = new Uint8Array(binaryString.length);
            for (let j = 0; j < binaryString.length; j++) {
              bytes[j] = binaryString.charCodeAt(j);
            }
            const blob = new Blob([bytes], { type: 'audio/mp3' });
            audioBlobs.push(blob);
          }
          
          currentProgress += segmentProgress;
          setPodcastAudio(prev => ({
            ...prev,
            progress: Math.min(90, currentProgress)
          }));
        } catch (segmentError) {
          console.error(`Error processing segment ${i}:`, segmentError);
        }
      }
      
      setPodcastAudio(prev => ({
        ...prev,
        progress: 90,
        message: "Combining audio segments..."
      }));
      
      const combinedBlob = new Blob(audioBlobs, { type: 'audio/mp3' });
      const audioFile = new File([combinedBlob], audioFileName, { type: 'audio/mp3' });
      
      setPodcastAudio(prev => ({
        ...prev,
        progress: 95,
        message: "Uploading podcast audio..."
      }));
      
      let uploadSuccess = false;
      let audioFileUrl = '';
      
      // Try audio_podcasts first
      try {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('audio_podcasts')
          .upload(audioFileName, audioFile);
          
        if (!uploadError) {
          console.log('Successfully uploaded to audio_podcasts bucket');
          const { data: publicUrlData } = await supabase.storage
            .from('audio_podcasts')
            .getPublicUrl(audioFileName);
            
          audioFileUrl = publicUrlData?.publicUrl || '';
          uploadSuccess = true;
        } else {
          console.error('Error uploading to audio_podcasts:', uploadError);
        }
      } catch (uploadError) {
        console.error('Exception uploading to audio_podcasts:', uploadError);
      }
      
      // If audio_podcasts failed, try podcast_audio as fallback
      if (!uploadSuccess) {
        try {
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('podcast_audio')
            .upload(audioFileName, audioFile);
            
          if (!uploadError) {
            console.log('Successfully uploaded to podcast_audio bucket');
            const { data: publicUrlData } = await supabase.storage
              .from('podcast_audio')
              .getPublicUrl(audioFileName);
              
            audioFileUrl = publicUrlData?.publicUrl || '';
            uploadSuccess = true;
          } else {
            console.error('Error uploading to podcast_audio:', uploadError);
          }
        } catch (uploadError) {
          console.error('Exception uploading to podcast_audio:', uploadError);
        }
      }
      
      if (!uploadSuccess) {
        throw new Error('Failed to upload audio file to any bucket');
      }
      
      // Update the podcast record with the new audio path
      const { error: updateError } = await supabase
        .from('lecture_podcast')
        .update({
          is_processed: true,
          stored_audio_path: audioFileName,
          audio_url: audioFileUrl
        })
        .eq('id', podcast.id);
        
      if (updateError) throw updateError;
      
      if (audioRef.current) {
        audioRef.current.src = audioFileUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.load();
      }
      
      setPodcastAudio({
        url: audioFileUrl,
        finished: true,
        progress: 100,
        message: "Podcast audio ready!"
      });
      
      await fetchPodcast();
      
      toast({
        title: "Success",
        description: "Podcast audio is ready to play"
      });
      
    } catch (error) {
      console.error('Error generating podcast audio:', error);
      toast({
        title: "Error",
        description: "Failed to generate podcast audio",
        variant: "destructive"
      });
    } finally {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setIsGeneratingAudio(false);
      setIsPollingSatus(false);
    }
  };

  const parseScript = (lines: string[]) => {
    const segments: {speaker: 'host' | 'guest', text: string}[] = [];
    let currentSpeaker: 'host' | 'guest' | null = null;
    let currentText = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;
      
      if (trimmedLine.startsWith('Host:')) {
        if (currentSpeaker && currentText) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim()
          });
        }
        
        currentSpeaker = 'host';
        currentText = trimmedLine.substring(5).trim();
      } 
      else if (trimmedLine.startsWith('Guest:') || 
               trimmedLine.startsWith('Expert:') || 
               trimmedLine.startsWith('Dr.')) {
        if (currentSpeaker && currentText) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim()
          });
        }
        
        currentSpeaker = 'guest';
        currentText = trimmedLine.includes(':') ? 
          trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim() : 
          trimmedLine;
      }
      else if (currentSpeaker) {
        currentText += ' ' + trimmedLine;
      }
      else {
        currentSpeaker = 'host';
        currentText = trimmedLine;
      }
    }
    
    if (currentSpeaker && currentText) {
      segments.push({
        speaker: currentSpeaker,
        text: currentText.trim()
      });
    }
    
    return segments;
  };

  const startPollingProgress = (startProgress: number) => {
    setIsPollingSatus(true);
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }
    
    let currentProgress = startProgress;
    const interval = window.setInterval(() => {
      if (currentProgress < 90) {
        currentProgress += 1;
        setPodcastAudio(prev => ({
          ...prev,
          progress: currentProgress
        }));
      } else {
        window.clearInterval(interval);
      }
    }, 1000);
    
    pollIntervalRef.current = interval;
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

  const downloadPodcast = async () => {
    if (podcast?.stored_audio_path) {
      try {
        const audioUrl = await getAudioUrl(podcast.stored_audio_path);
        
        if (audioUrl) {
          // Create a temporary link and trigger download
          const link = document.createElement('a');
          link.href = audioUrl;
          link.download = `podcast-${lectureId}.mp3`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          throw new Error('Could not retrieve download URL');
        }
      } catch (error) {
        console.error('Error downloading podcast:', error);
        toast({
          title: "Error",
          description: "Failed to download podcast. The audio file may not exist.",
          variant: "destructive"
        });
      }
    } else if (podcast?.audio_url) {
      // Direct download from URL
      try {
        const link = document.createElement('a');
        link.href = podcast.audio_url;
        link.download = `podcast-${lectureId}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading from audio URL:', error);
        toast({
          title: "Error",
          description: "Failed to download podcast from external URL",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Error",
        description: "No podcast audio available to download",
        variant: "destructive"
      });
    }
  };

  const calculateProgress = () => {
    if (!podcastAudio) return 0;
    return podcastAudio.progress || 0;
  };

  const hasPodcastAudio = () => {
    return podcast?.is_processed && (podcast?.audio_url || podcast?.stored_audio_path) || podcastAudio && (podcastAudio.url || podcastAudio.episode_url);
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
        console.log('Audio metadata loaded, duration:', audioRef.current.duration);
      }
    };
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('timeupdate', updateTime);
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('error', e => {
        console.error('Audio loading error:', e);
      });
    }
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('timeupdate', updateTime);
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('error', () => {});
      }
    };
  }, [isDraggingTime]);

  useEffect(() => {
    if (podcastAudio && audioRef.current) {
      const audioUrl = podcastAudio.url || podcastAudio.episode_url;
      if (audioUrl && audioRef.current.src !== audioUrl) {
        console.log('Updating audio source in useEffect:', audioUrl);
        audioRef.current.src = audioUrl;
        audioRef.current.volume = isMuted ? 0 : volume;
        audioRef.current.load();
      }
    }
  }, [podcastAudio, isMuted, volume]);

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

  if (error) {
    return (
      <PodcastBackground>
        <div className="container max-w-6xl py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Link to={`/course/${courseId}`}>
                <Button variant="gradient" size="sm" className="text-white hover:opacity-90">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Course
                </Button>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">Podcast</h1>
            </div>
          </div>
          
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="p-6 bg-white/80 rounded-lg shadow-lg max-w-md text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Error Loading Podcast</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <div className="flex justify-center space-x-3">
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={generatePodcast}
                >
                  Generate New Podcast
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PodcastBackground>
    );
  }

  return <PodcastBackground>
      <div className="container max-w-6xl py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Link to={`/course/${courseId}`}>
              <Button variant="gradient" size="sm" className="text-white hover:opacity-90">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Course
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">Podcast</h1>
          </div>
          {!isGenerating && !podcast}
          {!isGenerating && podcast && <div className="flex gap-2">
              {!hasPodcastAudio() && <Button onClick={generateAudio} disabled={isGeneratingAudio || isPollingSatus} variant="default" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md">
                  {isGeneratingAudio || isPollingSatus ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Headphones className="w-4 h-4 mr-2" />}
                  Generate Audio
                </Button>}
            </div>}
        </div>

        <div className="hidden">
          <audio ref={audioRef} onEnded={handleAudioEnded} controls className="w-full mb-4" onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} preload="auto" />
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

        {!isLoading && !isGenerating && !error && podcast && <>
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

            {hasPodcastAudio() && <Card className="p-6 mb-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-sm border border-indigo-200/50 shadow-lg rounded-2xl overflow-hidden">
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
                        <Button variant="ghost" size="icon" onClick={handleSeekBackward} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 transition-all">
                          <SkipBack className="h-6 w-6" />
                        </Button>
                        
                        <Button onClick={togglePlayPause} className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-md ${isPlaying ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' : 'bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'}`}>
                          {isPlaying ? <Pause className="h-6 w-6 text-white" /> : <Play className="h-6 w-6 text-white translate-x-0.5" />}
                        </Button>
                        
                        <Button variant="ghost" size="icon" onClick={handleSeekForward} className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 transition-all">
                          <SkipForward className="h-6 w-6" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 font-medium px-1">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="relative h-2 group">
                          <Slider value={[currentTime]} min={0} max={duration || 100} step={0.1} onValueChange={handleTimeChange} onValueCommit={() => setIsDraggingTime(false)} onMouseDown={() => setIsDraggingTime(true)} onMouseUp={() => setIsDraggingTime(false)} className="h-2" />
                          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full pointer-events-none" style={{
                      width: `${currentTime / (duration || 1) * 100}%`
                    }} />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end space-x-2">
                        <Button variant="ghost" size="icon" onClick={toggleMute} className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100/50 transition-all">
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <div className="w-24">
                          <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={handleVolumeChange} className="h-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>}

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
                    {!podcastAudio}
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

        {!isLoading && !isGenerating && !error && !podcast && <Card className="p-6 bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg">
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
