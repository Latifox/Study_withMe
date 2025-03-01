
import React, { useEffect, useState } from 'react';

interface BackgroundGradientProps {
  children: React.ReactNode;
}

const BackgroundGradient = ({ children }: BackgroundGradientProps) => {
  const [bubbles, setBubbles] = useState<Array<{
    id: number;
    size: number;
    position: { left?: string; right?: string; top: string };
    opacity: number;
    gradient: string;
    animationDuration: string;
    transitionDuration: string;
    type: 'purple' | 'star' | 'flame'; // Added bubble type property
  }>>([]);

  useEffect(() => {
    // Generate bubbles on component mount
    const generateBubbles = () => {
      const newBubbles = [];
      const totalBubbles = 80; // Increased for better coverage
      
      // Define more bold gradients with increased saturation for top section (purple/indigo)
      const purpleGradients = [
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
      
      // Define gradients for Star icon (yellow/amber) on left side
      const starGradients = [
        "bg-gradient-to-br from-yellow-400 to-amber-500",
        "bg-gradient-to-r from-yellow-500 to-amber-400",
        "bg-gradient-to-tr from-amber-400 to-yellow-600",
        "bg-gradient-to-br from-yellow-500 to-amber-600",
        "bg-gradient-to-r from-amber-400 to-yellow-500",
        "bg-gradient-to-bl from-yellow-500 via-amber-500 to-yellow-400",
        "bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500",
      ];
      
      // Define gradients for Flame icon (red/orange) on right side
      const flameGradients = [
        "bg-gradient-to-br from-red-400 to-orange-500",
        "bg-gradient-to-r from-red-500 to-orange-400",
        "bg-gradient-to-tr from-orange-500 to-red-600",
        "bg-gradient-to-br from-red-500 to-orange-600",
        "bg-gradient-to-r from-orange-400 to-red-500",
        "bg-gradient-to-bl from-red-500 via-orange-500 to-red-400",
        "bg-gradient-to-r from-orange-500 via-red-500 to-orange-600",
      ];
      
      // Generate bubbles for left side (top section - purple/indigo)
      for (let i = 0; i < totalBubbles / 4; i++) {
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
      for (let i = totalBubbles / 4; i < totalBubbles / 2; i++) {
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
      
      // Generate bubbles for left side (Star bubbles)
      for (let i = totalBubbles / 2; i < 3 * totalBubbles / 4; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15% from left
        const topPos = Math.random() * 40 + 15; // Middle to bottom section positioning
        const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
        const starGradientIndex = Math.floor(Math.random() * starGradients.length);
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
      
      // Generate bubbles for right side (Flame bubbles)
      for (let i = 3 * totalBubbles / 4; i < totalBubbles; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15% from right
        const topPos = Math.random() * 40 + 15; // Middle to bottom section positioning
        const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
        const flameGradientIndex = Math.floor(Math.random() * flameGradients.length);
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
      
      setBubbles(newBubbles);
    };

    generateBubbles();
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-100/30 to-indigo-100/30"></div>
      
      {/* Bubbles */}
      {bubbles.map((bubble) => {
        // Determine if this is a left or right bubble
        const isLeftBubble = bubble.position.left !== undefined;
        
        // Apply appropriate CSS classes based on bubble type
        const additionalClasses = bubble.type === 'purple' 
          ? 'bubble-purple fade-at-cards'
          : bubble.type === 'star'
            ? 'bubble-star star-transition'
            : 'bubble-flame flame-transition';
        
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
              transition: `all ${bubble.transitionDuration} ease-in-out`,
            }}
            data-bubble-type={bubble.type}
          />
        );
      })}

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Add keyframes and transitions for bubble animations */}
      <style>
        {`
        @keyframes bubble-down {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          85% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(120vh);
            opacity: 0;
          }
        }
        
        /* Base transition properties */
        .bubble-flow {
          transition-property: background, box-shadow, opacity;
        }
        
        /* Purple bubbles fade behind cards at icon sections */
        .bubble-purple.fade-at-cards[style*="top: 20"],
        .bubble-purple.fade-at-cards[style*="top: 21"],
        .bubble-purple.fade-at-cards[style*="top: 22"],
        .bubble-purple.fade-at-cards[style*="top: 23"],
        .bubble-purple.fade-at-cards[style*="top: 24"],
        .bubble-purple.fade-at-cards[style*="top: 25"],
        .bubble-purple.fade-at-cards[style*="top: 26"],
        .bubble-purple.fade-at-cards[style*="top: 27"],
        .bubble-purple.fade-at-cards[style*="top: 28"],
        .bubble-purple.fade-at-cards[style*="top: 29"],
        .bubble-purple.fade-at-cards[style*="top: 30"],
        .bubble-purple.fade-at-cards[style*="top: 31"],
        .bubble-purple.fade-at-cards[style*="top: 32"],
        .bubble-purple.fade-at-cards[style*="top: 33"],
        .bubble-purple.fade-at-cards[style*="top: 34"],
        .bubble-purple.fade-at-cards[style*="top: 35"],
        .bubble-purple.fade-at-cards[style*="top: 36"],
        .bubble-purple.fade-at-cards[style*="top: 37"],
        .bubble-purple.fade-at-cards[style*="top: 38"],
        .bubble-purple.fade-at-cards[style*="top: 39"],
        .bubble-purple.fade-at-cards[style*="top: 40"],
        .bubble-purple.fade-at-cards[style*="top: 41"],
        .bubble-purple.fade-at-cards[style*="top: 42"],
        .bubble-purple.fade-at-cards[style*="top: 43"],
        .bubble-purple.fade-at-cards[style*="top: 44"],
        .bubble-purple.fade-at-cards[style*="top: 45"] {
          opacity: 0 !important;
          transition: opacity 1.5s ease-out;
        }
        
        /* Star transitions */
        .bubble-star.star-transition:hover {
          box-shadow: 0 8px 15px rgba(255, 204, 0, 0.3);
        }
        
        /* Star bubbles at specified positions transition to yellow/amber */
        .bubble-star.star-transition[style*="top: 20"],
        .bubble-star.star-transition[style*="top: 21"],
        .bubble-star.star-transition[style*="top: 22"],
        .bubble-star.star-transition[style*="top: 23"],
        .bubble-star.star-transition[style*="top: 24"] {
          background: linear-gradient(to bottom right, #ffd700, #ffaa00);
          box-shadow: 0 4px 12px rgba(255, 204, 0, 0.25);
          opacity: 0.7;
        }
        
        .bubble-star.star-transition[style*="top: 25"],
        .bubble-star.star-transition[style*="top: 26"],
        .bubble-star.star-transition[style*="top: 27"],
        .bubble-star.star-transition[style*="top: 28"],
        .bubble-star.star-transition[style*="top: 29"] {
          background: linear-gradient(to bottom right, #ffd700, #ffaa00);
          box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
          opacity: 0.75;
        }
        
        .bubble-star.star-transition[style*="top: 30"],
        .bubble-star.star-transition[style*="top: 31"],
        .bubble-star.star-transition[style*="top: 32"],
        .bubble-star.star-transition[style*="top: 33"],
        .bubble-star.star-transition[style*="top: 34"],
        .bubble-star.star-transition[style*="top: 35"] {
          background: linear-gradient(to bottom right, #ffcc00, #ff9900);
          box-shadow: 0 4px 12px rgba(255, 180, 0, 0.35);
          opacity: 0.8;
        }
        
        .bubble-star.star-transition[style*="top: 36"],
        .bubble-star.star-transition[style*="top: 37"],
        .bubble-star.star-transition[style*="top: 38"],
        .bubble-star.star-transition[style*="top: 39"],
        .bubble-star.star-transition[style*="top: 40"],
        .bubble-star.star-transition[style*="top: 41"],
        .bubble-star.star-transition[style*="top: 42"],
        .bubble-star.star-transition[style*="top: 43"],
        .bubble-star.star-transition[style*="top: 44"],
        .bubble-star.star-transition[style*="top: 45"] {
          background: linear-gradient(to bottom right, #ffbc00, #ff8800);
          box-shadow: 0 4px 12px rgba(255, 150, 0, 0.4);
          opacity: 0.85;
        }
        
        /* Flame transitions */
        .bubble-flame.flame-transition:hover {
          box-shadow: 0 8px 15px rgba(255, 80, 0, 0.3);
        }
        
        /* Flame bubbles at specified positions transition to red/orange */
        .bubble-flame.flame-transition[style*="top: 20"],
        .bubble-flame.flame-transition[style*="top: 21"],
        .bubble-flame.flame-transition[style*="top: 22"],
        .bubble-flame.flame-transition[style*="top: 23"],
        .bubble-flame.flame-transition[style*="top: 24"] {
          background: linear-gradient(to bottom right, #ff4500, #ff7800);
          box-shadow: 0 4px 12px rgba(255, 80, 0, 0.25);
          opacity: 0.7;
        }
        
        .bubble-flame.flame-transition[style*="top: 25"],
        .bubble-flame.flame-transition[style*="top: 26"],
        .bubble-flame.flame-transition[style*="top: 27"],
        .bubble-flame.flame-transition[style*="top: 28"],
        .bubble-flame.flame-transition[style*="top: 29"] {
          background: linear-gradient(to bottom right, #ff4500, #ff7800);
          box-shadow: 0 4px 12px rgba(255, 80, 0, 0.3);
          opacity: 0.75;
        }
        
        .bubble-flame.flame-transition[style*="top: 30"],
        .bubble-flame.flame-transition[style*="top: 31"],
        .bubble-flame.flame-transition[style*="top: 32"],
        .bubble-flame.flame-transition[style*="top: 33"],
        .bubble-flame.flame-transition[style*="top: 34"],
        .bubble-flame.flame-transition[style*="top: 35"] {
          background: linear-gradient(to bottom right, #ff3300, #ff6600);
          box-shadow: 0 4px 12px rgba(255, 60, 0, 0.35);
          opacity: 0.8;
        }
        
        .bubble-flame.flame-transition[style*="top: 36"],
        .bubble-flame.flame-transition[style*="top: 37"],
        .bubble-flame.flame-transition[style*="top: 38"],
        .bubble-flame.flame-transition[style*="top: 39"],
        .bubble-flame.flame-transition[style*="top: 40"],
        .bubble-flame.flame-transition[style*="top: 41"],
        .bubble-flame.flame-transition[style*="top: 42"],
        .bubble-flame.flame-transition[style*="top: 43"],
        .bubble-flame.flame-transition[style*="top: 44"],
        .bubble-flame.flame-transition[style*="top: 45"] {
          background: linear-gradient(to bottom right, #ff2500, #ff5500);
          box-shadow: 0 4px 12px rgba(255, 40, 0, 0.4);
          opacity: 0.85;
        }
        `}
      </style>
    </div>
  );
};

export default BackgroundGradient;
