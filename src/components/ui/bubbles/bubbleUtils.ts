import { Bubble } from './types';

// Gradient definitions
export const purpleGradients = [
  "bg-gradient-to-br from-purple-400 to-indigo-500",
  "bg-gradient-to-r from-purple-500 to-indigo-400",
  "bg-gradient-to-tr from-indigo-400 to-purple-600",
  "bg-gradient-to-br from-violet-500 to-indigo-600",
  "bg-gradient-to-r from-fuchsia-400 to-purple-500",
  "bg-gradient-to-tr from-purple-400 to-indigo-600",
  "bg-gradient-to-br from-violet-400 to-indigo-500",
  "bg-gradient-to-r from-fuchsia-500 to-indigo-400",
  "bg-gradient-to-tr from-indigo-400 to-fuchsia-500",
  "bg-gradient-to-bl from-purple-500 via-violet-500 to-indigo-400",
  "bg-gradient-to-r from-pink-400 via-purple-500 to-indigo-500",
  "bg-gradient-to-tr from-indigo-500 via-violet-400 to-purple-500",
];

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
  const totalBubbles = 120; // Increased from 80 for better coverage
  
  // Generate bubbles for left side (top section - purple/indigo)
  for (let i = 0; i < totalBubbles / 6; i++) {
    const size = 30 + Math.random() * 100; // Random size between 30-130px
    const leftPos = Math.random() * 15; // Random position between 0-15% from left
    const topPos = Math.random() * 5 - 20; // Start above viewport or just entering
    const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
    const gradientIndex = Math.floor(Math.random() * purpleGradients.length);
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
      gradient: purpleGradients[gradientIndex],
      animationDuration,
      transitionDuration,
      type: 'purple' // Mark as purple bubble
    });
  }
  
  // Generate bubbles for right side (top section - purple/indigo)
  for (let i = totalBubbles / 6; i < totalBubbles / 3; i++) {
    const size = 30 + Math.random() * 100; // Random size between 30-130px
    const rightPos = Math.random() * 15; // Random position between 0-15% from right
    const topPos = Math.random() * 5 - 20; // Start above viewport or just entering
    const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
    const gradientIndex = Math.floor(Math.random() * purpleGradients.length);
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
      gradient: purpleGradients[gradientIndex],
      animationDuration,
      transitionDuration,
      type: 'purple' // Mark as purple bubble
    });
  }
  
  // Generate bubbles for left side (Star bubbles) - INCREASED QUANTITY
  for (let i = totalBubbles / 3; i < 2 * totalBubbles / 3; i++) {
    const size = 30 + Math.random() * 100; // Random size between 30-130px
    const leftPos = Math.random() * 25; // Increased from 15% to 25% for wider coverage
    const topPos = Math.random() * 40 + 15; // Middle to bottom section positioning
    const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
    const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
    const transitionDuration = `${1.5 + Math.random()}s`; // Random transition between 1.5-2.5s

    // Create a star bubble with initial purple gradient that will transition
    newBubbles.push({
      id: i,
      size,
      position: { 
        left: `${leftPos}%`, 
        top: `${topPos}%` 
      },
      opacity,
      gradient: purpleGradients[Math.floor(Math.random() * purpleGradients.length)], // Start with purple
      animationDuration,
      transitionDuration,
      type: 'star' // Mark as star bubble
    });
  }
  
  // Generate bubbles for right side (Flame bubbles) - INCREASED QUANTITY
  for (let i = 2 * totalBubbles / 3; i < totalBubbles; i++) {
    const size = 30 + Math.random() * 100; // Random size between 30-130px
    const rightPos = Math.random() * 25; // Increased from 15% to 25% for wider coverage
    const topPos = Math.random() * 40 + 15; // Middle to bottom section positioning
    const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
    const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
    const transitionDuration = `${1.5 + Math.random()}s`; // Random transition between 1.5-2.5s
    
    // Create a flame bubble with initial purple gradient that will transition
    newBubbles.push({
      id: i,
      size,
      position: { 
        right: `${rightPos}%`, 
        top: `${topPos}%` 
      },
      opacity,
      gradient: purpleGradients[Math.floor(Math.random() * purpleGradients.length)], // Start with purple
      animationDuration,
      transitionDuration,
      type: 'flame' // Mark as flame bubble
    });
  }
  
  return newBubbles;
};
