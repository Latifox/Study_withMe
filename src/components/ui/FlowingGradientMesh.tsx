
import { useEffect, useRef, useState } from "react";

interface FlowingGradientMeshProps {
  children: React.ReactNode;
}

const FlowingGradientMesh = ({ children }: FlowingGradientMeshProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };

    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Calculate gradient positions based on mouse and scroll
  const gradientX = 50 + mousePosition.x * 20; // Move 20% based on mouse X
  const gradientY = 50 + (mousePosition.y * 15 + (scrollPosition / 1000) * 15); // Move 15% based on mouse Y and scroll
  const gradientScale = 100 + (scrollPosition / 50); // Scale up slightly on scroll

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Base gradient background */}
      <div 
        className="absolute inset-0 transition-transform duration-1000 ease-out"
        style={{
          background: `radial-gradient(
            circle at ${gradientX}% ${gradientY}%, 
            rgba(214, 188, 250, 0.5) 0%, 
            rgba(155, 135, 245, 0.3) 25%, 
            rgba(122, 110, 170, 0.2) 50%, 
            rgba(211, 228, 253, 0.4) 75%
          )`,
          backgroundSize: `${gradientScale}% ${gradientScale}%`,
          backgroundPosition: 'center',
        }}
      />

      {/* Mesh pattern overlay with responsive animation */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ 
          transform: `rotate(${scrollPosition / 100}deg) scale(${1 + scrollPosition / 5000})` 
        }}
      >
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern 
              id="mesh" 
              width="50" 
              height="50" 
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${mousePosition.x * 10}) scale(${1 + mousePosition.y / 10})`}
            >
              <path 
                d="M0,25 Q12.5,0 25,25 Q37.5,50 50,25 M25,0 Q50,12.5 25,25 Q0,37.5 25,50"
                fill="none" 
                stroke="url(#gradient-line)" 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
            </pattern>
            <linearGradient id="gradient-line" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9b87f5" />
              <stop offset="50%" stopColor="#7E69AB" />
              <stop offset="100%" stopColor="#6E59A5" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#mesh)" />
        </svg>
      </div>
      
      {/* Floating blobs for added dimension */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute w-[40vw] h-[40vw] rounded-full opacity-20 animate-blob" 
          style={{ 
            background: 'linear-gradient(135deg, #9b87f5 0%, #D6BCFA 100%)',
            top: `${30 + mousePosition.y * 10}%`, 
            left: `${20 + mousePosition.x * 10}%`,
            filter: 'blur(50px)',
            transform: `translateX(${mousePosition.x * 20}px) translateY(${mousePosition.y * 20}px)`
          }}
        />
        <div 
          className="absolute w-[30vw] h-[30vw] rounded-full opacity-20 animate-blob animation-delay-2000" 
          style={{ 
            background: 'linear-gradient(135deg, #D3E4FD 0%, #7E69AB 100%)',
            top: `${60 - mousePosition.y * 10}%`, 
            right: `${20 - mousePosition.x * 5}%`,
            filter: 'blur(50px)',
            transform: `translateX(${-mousePosition.x * 15}px) translateY(${-mousePosition.y * 15}px)`
          }}
        />
        <div 
          className="absolute w-[35vw] h-[35vw] rounded-full opacity-10 animate-blob animation-delay-4000" 
          style={{ 
            background: 'linear-gradient(135deg, #E5DEFF 0%, #D3E4FD 100%)',
            bottom: `${20 - mousePosition.y * 5}%`, 
            left: `${50 - mousePosition.x * 10}%`,
            filter: 'blur(40px)',
            transform: `translateX(${mousePosition.x * 10}px) translateY(${-mousePosition.y * 10}px)`
          }}
        />
      </div>
      
      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default FlowingGradientMesh;
