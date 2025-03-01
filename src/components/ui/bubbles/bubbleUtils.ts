
import { Bubble } from './types';

// Gradient definitions
export const starGradients = [
  "bg-gradient-to-br from-yellow-400 to-amber-500",
  "bg-gradient-to-r from-yellow-500 to-amber-400",
  "bg-gradient-to-tr from-amber-400 to-yellow-600",
  "bg-gradient-to-br from-yellow-500 to-amber-600",
  "bg-gradient-to-r from-amber-400 to-yellow-500",
  "bg-gradient-to-bl from-yellow-500 via-amber-500 to-yellow-400",
  "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500",
];

export const flameGradients = [
  "bg-gradient-to-br from-red-400 to-orange-500",
  "bg-gradient-to-r from-red-500 to-orange-400",
  "bg-gradient-to-tr from-orange-500 to-red-600",
  "bg-gradient-to-br from-red-500 to-orange-600",
  "bg-gradient-to-r from-orange-400 to-red-500",
  "bg-gradient-to-bl from-red-500 via-orange-500 to-red-400",
  "bg-gradient-to-r from-orange-500 via-red-500 to-orange-600",
];

// Generate bubbles function
export const generateBubbles = (): Bubble[] => {
  const newBubbles = [];
  const totalBubbles = 80; // Total number of bubbles
  
  // Generate bubbles for left side (Star bubbles)
  for (let i = 0; i < totalBubbles / 2; i++) {
    const size = 30 + Math.random() * 100; // Random size between 30-130px
    const leftPos = Math.random() * 35; // Random position between 0-35% from left
    const topPos = Math.random() * 100 - 20; // Position from above viewport to bottom
    const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
    const gradientIndex = Math.floor(Math.random() * starGradients.length);
    const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
    const transitionDuration = `${1.5 + Math.random()}s`; // Random transition between 1.5-2.5s
    
    newBubbles.push({
      id: i,
      size,
      position: { 
        left: `${leftPos}%`, 
        top: `${topPos}%` 
      },
      opacity,
      gradient: starGradients[gradientIndex], // Use star gradients from the start
      animationDuration,
      transitionDuration,
      type: 'star' // Mark as star bubble
    });
  }
  
  // Generate bubbles for right side (Flame bubbles)
  for (let i = totalBubbles / 2; i < totalBubbles; i++) {
    const size = 30 + Math.random() * 100; // Random size between 30-130px
    const rightPos = Math.random() * 35; // Random position between 0-35% from right
    const topPos = Math.random() * 100 - 20; // Position from above viewport to bottom
    const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
    const gradientIndex = Math.floor(Math.random() * flameGradients.length);
    const animationDuration = `${15 + Math.random() * 20}s`; // Random duration between 15-35s
    const transitionDuration = `${1.5 + Math.random()}s`; // Random transition between 1.5-2.5s
    
    newBubbles.push({
      id: i,
      size,
      position: { 
        right: `${rightPos}%`, 
        top: `${topPos}%` 
      },
      opacity,
      gradient: flameGradients[gradientIndex], // Use flame gradients from the start
      animationDuration,
      transitionDuration,
      type: 'flame' // Mark as flame bubble
    });
  }
  
  return newBubbles;
};
