
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
      <div className="absolute inset-0 bg-gradient-to-b from-purple-100/30 to-indigo-100/30"></div>
      
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
