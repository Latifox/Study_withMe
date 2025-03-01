
import React, { useEffect, useState } from 'react';
import { Bubble } from './bubbles/types';
import { generateBubbles } from './bubbles/bubbleUtils';
import { bubbleAnimationStyles } from './bubbles/bubbleStyles';
import BubbleRenderer from './bubbles/BubbleRenderer';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

const BackgroundGradient = ({ children }: BackgroundGradientProps) => {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    // Generate bubbles on component mount
    setBubbles(generateBubbles());
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-100/30 to-indigo-100/30">
        {/* Animated mesh pattern */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      </div>
      
      {/* Bubbles */}
      <BubbleRenderer bubbles={bubbles} />

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Add keyframes and transitions for bubble animations */}
      <style>
        {bubbleAnimationStyles}
      </style>
    </div>
  );
};

export default BackgroundGradient;
