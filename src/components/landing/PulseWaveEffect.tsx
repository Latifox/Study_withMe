
import { useEffect, useRef } from "react";

const PulseWaveEffect = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    // Set canvas size to match window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    // Pulse wave parameters
    const waves = [
      { y: -200, speed: 0.7, opacity: 0.4 },
      { y: -600, speed: 0.5, opacity: 0.3 },
      { y: -1000, speed: 0.9, opacity: 0.2 },
    ];
    
    // Animation function
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw waves
      waves.forEach(wave => {
        // Move wave down
        wave.y += wave.speed;
        
        // Reset wave when it goes off canvas
        if (wave.y > canvas.height + 200) {
          wave.y = -200;
        }
        
        // Draw pulse wave
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(0, wave.y - 100, 0, wave.y + 100);
        gradient.addColorStop(0, `rgba(128, 90, 213, 0)`);
        gradient.addColorStop(0.5, `rgba(128, 90, 213, ${wave.opacity})`);
        gradient.addColorStop(1, `rgba(128, 90, 213, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, wave.y - 100, canvas.width, 200);
      });
      
      requestAnimationFrame(animate);
    };
    
    // Start animation
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

export default PulseWaveEffect;
