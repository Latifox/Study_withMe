import { useRef, useEffect } from 'react';

export default function ThreeBackground() {
  return (
    <div className="absolute inset-0 -z-10">
      {/* Purple Light Beam */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[20vw] h-[70vh] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/60 via-purple-500/20 to-transparent animate-pulse-beam rounded-full blur-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-400/50 via-violet-500/30 to-transparent animate-glow-beam rounded-full blur-xl"></div>
      </div>
      
      {/* Additional gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/10 via-transparent to-purple-900/10"></div>
    </div>
  );
}
