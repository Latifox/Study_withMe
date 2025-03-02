
import React, { useEffect, useRef } from 'react';
import { BubbleProps } from './types';

const PurpleBubble: React.FC<BubbleProps> = ({ 
  bubble,
  additionalClasses
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  // Force animation to start immediately on mount
  useEffect(() => {
    if (bubbleRef.current) {
      // Trigger a reflow to force immediate animation
      void bubbleRef.current.offsetHeight;
      
      // Ensure animation is running
      bubbleRef.current.style.animationPlayState = "running";
      bubbleRef.current.style.animationDelay = "0s";
    }
  }, []);
  
  return (
    <div
      ref={bubbleRef}
      key={bubble.id}
      className={`absolute rounded-full ${bubble.gradient} bubble-flow ${additionalClasses} shadow-lg`}
      style={{
        width: `${bubble.size}px`,
        height: `${bubble.size}px`,
        left: bubble.position.left,
        right: bubble.position.right,
        top: bubble.position.top,
        opacity: bubble.opacity,
        animation: `bubble-down ${bubble.animationDuration} linear infinite`,
        animationDelay: "0s", // Ensure no delay for purple bubbles
        animationPlayState: "running", // Start animation immediately
        transition: `all ${bubble.transitionDuration} ease-in-out`,
      }}
      data-bubble-type={bubble.type}
      data-testid="purple-bubble"
    />
  );
};

export default PurpleBubble;
