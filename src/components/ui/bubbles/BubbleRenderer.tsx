
import React from 'react';
import { Bubble } from './types';
import PurpleBubble from './PurpleBubble';
import StarBubble from './StarBubble';
import FlameBubble from './FlameBubble';

interface BubbleRendererProps {
  bubbles: Bubble[];
}

const BubbleRenderer: React.FC<BubbleRendererProps> = ({ bubbles }) => {
  return (
    <>
      {bubbles.map((bubble) => {
        // Determine if this is a left or right bubble
        const isLeftBubble = bubble.position.left !== undefined;
        
        // Apply appropriate CSS classes based on bubble type
        const additionalClasses = bubble.type === 'purple' 
          ? 'bubble-purple hide-behind-cards'  // Updated class name for purple bubbles
          : bubble.type === 'star'
            ? 'bubble-star star-transition pass-through-left'  // Added pass-through class for star bubbles
            : 'bubble-flame flame-transition pass-through-right';  // Added pass-through class for flame bubbles
        
        switch (bubble.type) {
          case 'purple':
            return <PurpleBubble key={bubble.id} bubble={bubble} additionalClasses={additionalClasses} />;
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
