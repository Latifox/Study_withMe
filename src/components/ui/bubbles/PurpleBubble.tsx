
import React, { useEffect, useRef } from 'react';
import { BubbleProps } from './types';

const PurpleBubble: React.FC<BubbleProps> = ({ 
  bubble,
  additionalClasses
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  // Aggressive animation start enforcement
  useEffect(() => {
    if (bubbleRef.current) {
      // Apply critical animation properties directly
      const applyStyles = () => {
        if (!bubbleRef.current) return;
        
        // Force animation state via inline styles (highest specificity)
        bubbleRef.current.style.visibility = 'visible';
        bubbleRef.current.style.opacity = bubble.opacity.toString();
        bubbleRef.current.style.animation = `bubble-down ${bubble.animationDuration} linear infinite`;
        bubbleRef.current.style.animationPlayState = 'running';
        bubbleRef.current.style.animationDelay = '0s';
        
        // Force browser reflow to ensure styles are applied
        void bubbleRef.current.offsetWidth;
      };
      
      // Apply styles immediately
      applyStyles();
      
      // And also after a tiny delay in case of browser quirks
      requestAnimationFrame(applyStyles);
      
      // Final fallback with setTimeout
      setTimeout(applyStyles, 10);
    }
  }, [bubble.animationDuration, bubble.opacity]);
  
  return (
    <div
      ref={bubbleRef}
      key={bubble.id}
      className={`absolute rounded-full ${bubble.gradient} bubble-flow ${additionalClasses} shadow-lg animate-now force-animation`}
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
        visibility: 'visible', // Ensure visibility from the start
      }}
      data-bubble-type={bubble.type}
      data-testid="purple-bubble"
    />
  );
};

export default PurpleBubble;
