
import React, { useEffect, useRef } from "react";

interface AudioWaveformProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ audioRef, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    // Set up audio context and analyzer when component mounts
    if (!audioRef.current) return;

    const initializeAudio = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      
      // Set up parameters for visualization
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioContext.createMediaElementSource(audioRef.current!);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
    };
    
    try {
      initializeAudio();
    } catch (err) {
      console.error("Error initializing audio analyzer:", err);
    }
    
    return () => {
      // Clean up on unmount
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioRef]);

  useEffect(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const draw = () => {
      if (!isPlaying) {
        // Draw static waveform when not playing
        drawStaticWaveform(ctx, canvas);
        return;
      }
      
      analyserRef.current!.getByteFrequencyData(dataArray);
      
      // Clear canvas for next frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set gradient for waveform
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, 'rgba(79, 70, 229, 0.6)'); // indigo-600
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.6)'); // purple-500
      
      ctx.fillStyle = 'rgba(244, 247, 250, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw base line
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
      ctx.stroke();
      
      // Draw waveform
      const barWidth = canvas.width / dataArray.length * 2.5;
      let x = 0;
      
      for (let i = 0; i < dataArray.length; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height / 2);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, (canvas.height / 2) - barHeight, barWidth, barHeight * 2);
        
        x += barWidth + 1;
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    // Start animation loop
    animationRef.current = requestAnimationFrame(draw);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);
  
  // Draw a static waveform when not playing
  const drawStaticWaveform = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set gradient for static waveform
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.3)'); // indigo-600 with lower opacity
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.3)'); // purple-500 with lower opacity
    
    ctx.fillStyle = 'rgba(244, 247, 250, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw base line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.stroke();
    
    // Draw a gentle static waveform
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    
    for (let i = 0; i < canvas.width; i += 5) {
      // Sine wave with small amplitude
      const y = (canvas.height / 2) + Math.sin(i * 0.05) * 5;
      ctx.lineTo(i, y);
    }
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-20 rounded-lg bg-indigo-50/5"
      width={1000}
      height={100}
    />
  );
};

export default AudioWaveform;
