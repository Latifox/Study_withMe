
import React from 'react';

interface StoryBackgroundProps {
  children: React.ReactNode;
}

const StoryBackground = ({ children }: StoryBackgroundProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient container with warm educational colors */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FFE5A3 0%, #FFFFFF 50%, #A7D1FF 100%)'
        }}
      >
        {/* Mesh grid overlay */}
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000" strokeWidth="1" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default StoryBackground;
