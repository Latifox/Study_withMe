
import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Point {
  x: number;
  y: number;
  originX: number;
  originY: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
}

const DynamicWaveform = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const pointsRef = useRef<Point[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Initialize SimplexNoise
  const noise = (x: number, y: number) => {
    // Simple noise function that combines sin waves
    return (
      Math.sin(x * 0.01 + y * 0.005) +
      Math.sin(x * 0.02 + y * 0.01) * 0.5 +
      Math.sin(x * 0.03 + y * 0.02) * 0.25
    );
  };

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        setDimensions({ width: rect.width, height: rect.height });
        
        // Initialize points
        initializePoints();
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial call

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const initializePoints = () => {
    if (!canvasRef.current) return;

    const { width, height } = canvasRef.current;
    const points: Point[] = [];
    const gridSize = 60; // Distance between points
    
    for (let x = 0; x < width + gridSize; x += gridSize) {
      for (let y = 0; y < height + gridSize; y += gridSize) {
        points.push({
          x: x,
          y: y,
          originX: x,
          originY: y,
          noiseOffsetX: Math.random() * 1000,
          noiseOffsetY: Math.random() * 1000
        });
      }
    }

    pointsRef.current = points;
  };

  // Animation loop
  useEffect(() => {
    const animate = (time: number) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw points
      const points = pointsRef.current;
      const mouseX = mousePosition.x;
      const mouseY = mousePosition.y;

      // Time factor for animation
      const timeFactor = time * 0.001;
      // Scroll factor to influence wave frequency
      const scrollFactor = scrollPosition * 0.01;

      // Draw curves
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);

      for (let i = 0; i < points.length; i++) {
        const point = points[i];
        
        // Calculate noise values
        const noiseX = noise(point.originX + timeFactor, point.originY + scrollFactor);
        const noiseY = noise(point.originY + timeFactor, point.originX + scrollFactor);
        
        // Calculate mouse influence (decreases with distance)
        const dx = mouseX - point.originX;
        const dy = mouseY - point.originY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const mouseInfluence = Math.max(0, 1 - distance / 300) * 20;
        
        // Apply forces to point position
        point.x = point.originX + noiseX * 15 + (dx / distance || 0) * mouseInfluence;
        point.y = point.originY + noiseY * 15 + (dy / distance || 0) * mouseInfluence;
      }

      // Create and style gradient paths
      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        
        // Use different colors for each wave
        if (wave === 0) {
          gradient.addColorStop(0, "rgba(147, 51, 234, 0.07)"); // Purple
          gradient.addColorStop(1, "rgba(79, 70, 229, 0.07)"); // Indigo
        } else if (wave === 1) {
          gradient.addColorStop(0, "rgba(79, 70, 229, 0.05)"); // Indigo
          gradient.addColorStop(1, "rgba(67, 56, 202, 0.05)"); // Darker indigo
        } else {
          gradient.addColorStop(0, "rgba(124, 58, 237, 0.06)"); // Violet
          gradient.addColorStop(1, "rgba(109, 40, 217, 0.06)"); // Darker violet
        }
        
        ctx.fillStyle = gradient;
        
        // Starting point of the wave path
        ctx.moveTo(0, canvas.height);
        
        // Draw the wave using quadratic curves
        const pointsInRow = Math.ceil(canvas.width / 60) + 1;
        
        for (let x = 0; x < pointsInRow; x++) {
          // Find points that are at appropriate y positions for waves
          const index = Math.floor(points.length / 3) * wave + x;
          if (index >= points.length) continue;
          
          const point = points[index];
          const nextPoint = points[Math.min(index + 1, points.length - 1)];
          
          // Adjust wave height based on which wave we're drawing
          const waveOffset = canvas.height / 3 * (wave + 1) + Math.sin(timeFactor + x * 0.5) * 20;
          
          // Control point for the quadratic curve
          const cpX = (point.x + nextPoint.x) / 2;
          const cpY = waveOffset + noiseY(x, timeFactor + wave) * 30;
          
          ctx.quadraticCurveTo(
            point.x, 
            cpY,
            cpX, 
            cpY
          );
        }
        
        // Complete the wave path
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        ctx.fill();
      }
      
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [mousePosition, scrollPosition]);

  // Helper noise function for waves
  const noiseY = (x: number, t: number) => {
    return Math.sin(x * 0.1 + t) + Math.sin(x * 0.15 + t * 1.5) * 0.5;
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div 
        className="absolute inset-0 opacity-100 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </motion.div>
    </div>
  );
};

export default DynamicWaveform;
