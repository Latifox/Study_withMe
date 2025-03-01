
import React from 'react';
import { Bubble } from './types';
import StarBubble from './StarBubble';
import FlameBubble from './FlameBubble';

interface BubbleRendererProps {
  bubbles: Bubble[];
}

const BubbleRenderer: React.FC<BubbleRendererProps> = ({ bubbles }) => {
  return (
    <>
      {bubbles.map((bubble) => {
        // Apply appropriate CSS classes based on bubble type
        const additionalClasses = bubble.type === 'star'
          ? 'bubble-star star-transition pass-through-left'
          : 'bubble-flame flame-transition pass-through-right';
        
        switch (bubble.type) {
          case 'star':
            return <StarBubble key={bubble.id} bubble={bubble} additionalClasses={additionalClasses} />;
          case 'flame':
            return <FlameBubble key={bubble.id} bubble={bubble} additionalClasses={additionalClasses} />;
          default:
            return null;
        }
      })}
    </>
  );
};

export default BubbleRenderer;
