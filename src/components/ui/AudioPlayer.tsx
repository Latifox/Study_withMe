
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { 
  Play, 
  Pause, 
  VolumeX, 
  Volume2, 
  SkipBack, 
  SkipForward 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioPlayerProps {
  audioUrl: string | undefined;
  onError?: (error: Error) => void;
}

export function AudioPlayer({ audioUrl, onError }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDraggingTime, setIsDraggingTime] = useState(false);
  const [hasError, setHasError] = useState(false);
  const { toast } = useToast();
  
  // Effect to initialize audio element
  useEffect(() => {
    const audioElement = new Audio();
    audioRef.current = audioElement;
    
    const handleCanPlayThrough = () => {
      console.log("Audio can play through successfully");
      setHasError(false);
    };
    
    const handleLoadedMetadata = () => {
      if (audioElement) {
        console.log("Audio metadata loaded, duration:", audioElement.duration);
        setDuration(audioElement.duration);
      }
    };
    
    const handleTimeUpdate = () => {
      if (audioElement && !isDraggingTime) {
        setCurrentTime(audioElement.currentTime);
      }
    };
    
    const handleEnded = () => {
      console.log("Audio playback ended");
      setIsPlaying(false);
    };
    
    const handleLoadError = (e: ErrorEvent) => {
      console.error("Error loading audio:", e);
      setHasError(true);
      setIsPlaying(false);
      
      if (onError) {
        onError(new Error("Failed to load audio file"));
      }
      
      toast({
        title: "Audio Error",
        description: "Failed to load audio file. The file may be unavailable or the link may have expired.",
        variant: "destructive"
      });
    };
    
    // Add event listeners
    audioElement.addEventListener('canplaythrough', handleCanPlayThrough);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleLoadError as EventListener);
    
    return () => {
      // Clean up event listeners and audio
      audioElement.removeEventListener('canplaythrough', handleCanPlayThrough);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleLoadError as EventListener);
      
      audioElement.pause();
      audioElement.src = "";
      audioRef.current = null;
    };
  }, [isDraggingTime, toast, onError]);
  
  // Effect to handle URL changes
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement && audioUrl) {
      console.log("Setting audio source to:", audioUrl);
      
      // Stop any current playback
      audioElement.pause();
      setIsPlaying(false);
      
      // Set volume before loading new source
      audioElement.volume = isMuted ? 0 : volume;
      
      // Reset error state
      setHasError(false);
      
      // Set new source and preload
      audioElement.src = audioUrl;
      audioElement.load();
    }
  }, [audioUrl, volume, isMuted]);
  
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (hasError) {
      // Try to reload the audio if there was an error
      if (audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        setHasError(false);
      }
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Audio playback started successfully");
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Error playing audio:", error);
            toast({
              title: "Playback Error",
              description: "There was an issue playing the audio. Please try again.",
              variant: "destructive"
            });
          });
      }
    }
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      setIsMuted(!isMuted);
      audioRef.current.muted = !isMuted;
    }
  };
  
  const handleTimeChange = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };
  
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : newVolume;
    }
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
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  return (
    <div className="flex flex-col space-y-6">
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
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all shadow-md ${
            isPlaying 
              ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
              : 'bg-gradient-to-tr from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
          }`}
          disabled={!audioUrl}
        >
          {isPlaying 
            ? <Pause className="h-6 w-6 text-white" /> 
            : <Play className="h-6 w-6 text-white translate-x-0.5" />
          }
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
            disabled={!audioUrl || hasError}
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
  );
}
