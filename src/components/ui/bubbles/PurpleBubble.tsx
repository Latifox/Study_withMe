
import React, { useEffect, useRef } from 'react';
import { BubbleProps } from './types';

const PurpleBubble: React.FC<BubbleProps> = ({ 
  bubble,
  additionalClasses
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  // Enhanced animation start forcing on mount
  useEffect(() => {
    if (bubbleRef.current) {
      // Set inline styles to force immediate animation start
      bubbleRef.current.style.visibility = 'visible';
      bubbleRef.current.style.animationName = 'bubble-down';
      bubbleRef.current.style.animationPlayState = 'running';
      bubbleRef.current.style.animationDelay = '0s';
      
      // Force reflow to kick-start the animation immediately
      void bubbleRef.current.offsetWidth;
      
      // Double-check animation is running after a slight delay
      // This helps ensure any potential browser inconsistency is addressed
      setTimeout(() => {
        if (bubbleRef.current) {
          bubbleRef.current.style.animationPlayState = 'running';
        }
      }, 10);
    }
  }, []);
  
  return (
    <div
      ref={bubbleRef}
      key={bubble.id}
      className={`absolute rounded-full ${bubble.gradient} bubble-flow ${additionalClasses} shadow-lg animate-now`}
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
