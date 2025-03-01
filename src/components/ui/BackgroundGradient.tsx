
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
  }>>([]);

  useEffect(() => {
    // Generate bubbles on component mount
    const generateBubbles = () => {
      const newBubbles = [];
      const totalBubbles = 80; // Increased for better coverage
      
      // Define more bold gradients with increased saturation for top section (purple/indigo)
      const topGradients = [
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
      
      // Transition threshold positions (% of screen height)
      const transitionThreshold = {
        starBegin: 20, // Start transitioning to star color at 20% of screen height
        flameBegin: 20, // Start transitioning to flame color at 20% of screen height
      };
      
      // Generate bubbles for left side (top section - purple/indigo)
      for (let i = 0; i < totalBubbles / 4; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15% from left
        const topPos = Math.random() * 5 - 20; // Start above viewport or just entering
        const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
        const gradientIndex = Math.floor(Math.random() * topGradients.length);
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
          gradient: topGradients[gradientIndex],
          animationDuration,
          transitionDuration
        });
      }
      
      // Generate bubbles for right side (top section - purple/indigo)
      for (let i = totalBubbles / 4; i < totalBubbles / 2; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15% from right
        const topPos = Math.random() * 5 - 20; // Start above viewport or just entering
        const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
        const gradientIndex = Math.floor(Math.random() * topGradients.length);
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
          gradient: topGradients[gradientIndex],
          animationDuration,
          transitionDuration
        });
      }
      
      // Generate bubbles for left side (middle to bottom section - transition to star yellow)
      for (let i = totalBubbles / 2; i < 3 * totalBubbles / 4; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const leftPos = Math.random() * 15; // Random position between 0-15% from left
        const topPos = Math.random() * 40 + 15; // Middle to bottom section positioning
        const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
        const gradientIndex = Math.floor(Math.random() * topGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
        const transitionDuration = `${1.5 + Math.random()}s`; // Random transition between 1.5-2.5s
        
        // Start with top gradients but will transition to star gradients via CSS animations
        newBubbles.push({
          id: i,
          size,
          position: { 
            left: `${leftPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: topGradients[gradientIndex],
          animationDuration,
          transitionDuration
        });
      }
      
      // Generate bubbles for right side (middle to bottom section - transition to flame red)
      for (let i = 3 * totalBubbles / 4; i < totalBubbles; i++) {
        const size = 30 + Math.random() * 100; // Random size between 30-130px
        const rightPos = Math.random() * 15; // Random position between 0-15% from right
        const topPos = Math.random() * 40 + 15; // Middle to bottom section positioning
        const opacity = 0.5 + Math.random() * 0.3; // Random opacity between 0.5-0.8
        const gradientIndex = Math.floor(Math.random() * topGradients.length);
        const animationDuration = `${15 + Math.random() * 20}s`; // Random duration
        const transitionDuration = `${1.5 + Math.random()}s`; // Random transition between 1.5-2.5s
        
        // Start with top gradients but will transition to flame gradients via CSS animations
        newBubbles.push({
          id: i,
          size,
          position: { 
            right: `${rightPos}%`, 
            top: `${topPos}%` 
          },
          opacity,
          gradient: topGradients[gradientIndex],
          animationDuration,
          transitionDuration
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
        
        // Get the star or flame gradients based on position
        const targetGradients = isLeftBubble ? 'starGradients' : 'flameGradients';
        const bubbleClass = isLeftBubble ? 'bubble-transition-star' : 'bubble-transition-flame';
        
        return (
          <div
            key={bubble.id}
            className={`absolute rounded-full ${bubble.gradient} bubble-flow ${bubbleClass} shadow-lg`}
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
            data-initial-gradient={bubble.gradient}
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
        
        /* Define star gradients for left-side bubbles */
        .bubble-transition-star {
          transition-property: background, box-shadow, opacity;
        }
        
        .bubble-transition-star:hover {
          box-shadow: 0 8px 15px rgba(255, 204, 0, 0.3);
        }
        
        /* At position thresholds, apply transition for left bubbles (Star) */
        .bubble-flow.bubble-transition-star[style*="top: 20"] {
          background: linear-gradient(to bottom right, #ffd700, #ffaa00);
          box-shadow: 0 4px 12px rgba(255, 204, 0, 0.25);
        }
        
        .bubble-flow.bubble-transition-star[style*="top: 21"],
        .bubble-flow.bubble-transition-star[style*="top: 22"],
        .bubble-flow.bubble-transition-star[style*="top: 23"],
        .bubble-flow.bubble-transition-star[style*="top: 24"],
        .bubble-flow.bubble-transition-star[style*="top: 25"],
        .bubble-flow.bubble-transition-star[style*="top: 26"],
        .bubble-flow.bubble-transition-star[style*="top: 27"],
        .bubble-flow.bubble-transition-star[style*="top: 28"],
        .bubble-flow.bubble-transition-star[style*="top: 29"] {
          background: linear-gradient(to bottom right, #ffd700, #ffaa00);
          box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
        }
        
        .bubble-flow.bubble-transition-star[style*="top: 3"],
        .bubble-flow.bubble-transition-star[style*="top: 4"],
        .bubble-flow.bubble-transition-star[style*="top: 5"] {
          background: linear-gradient(to bottom right, #ffcc00, #ff9900);
          box-shadow: 0 4px 12px rgba(255, 180, 0, 0.35);
        }
        
        /* Define flame gradients for right-side bubbles */
        .bubble-transition-flame {
          transition-property: background, box-shadow, opacity;
        }
        
        .bubble-transition-flame:hover {
          box-shadow: 0 8px 15px rgba(255, 80, 0, 0.3);
        }
        
        /* At position thresholds, apply transition for right bubbles (Flame) */
        .bubble-flow.bubble-transition-flame[style*="top: 20"] {
          background: linear-gradient(to bottom right, #ff4500, #ff7800);
          box-shadow: 0 4px 12px rgba(255, 80, 0, 0.25);
        }
        
        .bubble-flow.bubble-transition-flame[style*="top: 21"],
        .bubble-flow.bubble-transition-flame[style*="top: 22"],
        .bubble-flow.bubble-transition-flame[style*="top: 23"],
        .bubble-flow.bubble-transition-flame[style*="top: 24"],
        .bubble-flow.bubble-transition-flame[style*="top: 25"],
        .bubble-flow.bubble-transition-flame[style*="top: 26"],
        .bubble-flow.bubble-transition-flame[style*="top: 27"],
        .bubble-flow.bubble-transition-flame[style*="top: 28"],
        .bubble-flow.bubble-transition-flame[style*="top: 29"] {
          background: linear-gradient(to bottom right, #ff4500, #ff7800);
          box-shadow: 0 4px 12px rgba(255, 80, 0, 0.3);
        }
        
        .bubble-flow.bubble-transition-flame[style*="top: 3"],
        .bubble-flow.bubble-transition-flame[style*="top: 4"],
        .bubble-flow.bubble-transition-flame[style*="top: 5"] {
          background: linear-gradient(to bottom right, #ff3300, #ff6600);
          box-shadow: 0 4px 12px rgba(255, 60, 0, 0.35);
        }
        `}
      </style>
    </div>
  );
};

export default BackgroundGradient;
