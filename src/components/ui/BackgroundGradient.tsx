
import React from 'react';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

const BackgroundGradient = ({ children }: BackgroundGradientProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient container */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #FFE5A3 0%, #FFFFFF 50%, #A7D1FF 100%)',
          zIndex: 0
        }}
      >
        {/* Mesh grid overlay */}
        <div className="absolute inset-0" style={{ opacity: 0.15 }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern 
                id="smallGrid" 
                width="8" 
                height="8" 
                patternUnits="userSpaceOnUse"
              >
                <path 
                  d="M 8 0 L 0 0 0 8" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.5"
                />
              </pattern>
              <pattern 
                id="grid" 
                width="32" 
                height="32" 
                patternUnits="userSpaceOnUse"
              >
                <rect width="32" height="32" fill="url(#smallGrid)" />
                <path 
                  d="M 32 0 L 0 0 0 32" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-black" />
          </svg>
        </div>
      </div>

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default BackgroundGradient;
