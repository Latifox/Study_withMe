
import React from 'react';
import { BubbleProps } from './types';

const PurpleBubble: React.FC<BubbleProps> = ({ 
  bubble,
  additionalClasses
}) => {
  return (
    <div
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
    />
  );
};

export default PurpleBubble;
