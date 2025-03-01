
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
        // All bubbles start as purple, with transition classes based on type
        const additionalClasses = bubble.type === 'purple' 
          ? 'bubble-purple hide-behind-cards'
          : bubble.type === 'star'
            ? 'bubble-star star-transition fade-transform-effect pass-through-left'
            : 'bubble-flame flame-transition fade-transform-effect pass-through-right';
        
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
