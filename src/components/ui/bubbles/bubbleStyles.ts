export const bubbleAnimationStyles = `
@keyframes bubble-down {
  0% {
    transform: translateY(0);
    opacity: 0;
  }
  1% {
    opacity: 0.8;  /* Start showing much faster */
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
  animation-play-state: running !important; /* Force all bubbles to start immediately */
  animation-delay: 0s !important; /* No delay for any bubbles */
}

/* Purple bubbles completely fade out behind the cards - expanded range to ensure complete coverage */
[data-bubble-type="purple"].hide-behind-cards {
  transition: opacity 0.5s ease-out;
  animation-play-state: running !important; /* Ensure animation starts immediately */
  animation-delay: 0s !important; /* No delay for purple bubbles */
}

/* Target all bubbles that should fade out at the end of hero section */
[data-bubble-type].hide-behind-cards[style*="top: 65"],
[data-bubble-type].hide-behind-cards[style*="top: 66"],
[data-bubble-type].hide-behind-cards[style*="top: 67"],
[data-bubble-type].hide-behind-cards[style*="top: 68"],
[data-bubble-type].hide-behind-cards[style*="top: 69"],
[data-bubble-type].hide-behind-cards[style*="top: 70"],
[data-bubble-type].hide-behind-cards[style*="top: 71"],
[data-bubble-type].hide-behind-cards[style*="top: 72"],
[data-bubble-type].hide-behind-cards[style*="top: 73"],
[data-bubble-type].hide-behind-cards[style*="top: 74"],
[data-bubble-type].hide-behind-cards[style*="top: 75"],
[data-bubble-type].hide-behind-cards[style*="top: 76"],
[data-bubble-type].hide-behind-cards[style*="top: 77"],
[data-bubble-type].hide-behind-cards[style*="top: 78"],
[data-bubble-type].hide-behind-cards[style*="top: 79"],
[data-bubble-type].hide-behind-cards[style*="top: 80"],
[data-bubble-type].hide-behind-cards[style*="top: 81"],
[data-bubble-type].hide-behind-cards[style*="top: 82"],
[data-bubble-type].hide-behind-cards[style*="top: 83"],
[data-bubble-type].hide-behind-cards[style*="top: 84"],
[data-bubble-type].hide-behind-cards[style*="top: 85"],
[data-bubble-type].hide-behind-cards[style*="top: 86"],
[data-bubble-type].hide-behind-cards[style*="top: 87"],
[data-bubble-type].hide-behind-cards[style*="top: 88"],
[data-bubble-type].hide-behind-cards[style*="top: 89"],
[data-bubble-type].hide-behind-cards[style*="top: 90"],
[data-bubble-type].hide-behind-cards[style*="top: 91"],
[data-bubble-type].hide-behind-cards[style*="top: 92"],
[data-bubble-type].hide-behind-cards[style*="top: 93"],
[data-bubble-type].hide-behind-cards[style*="top: 94"],
[data-bubble-type].hide-behind-cards[style*="top: 95"] {
  opacity: 0 !important;
  transition: opacity 0.7s ease-out;
}

/* Target all purple bubbles in the range where cards appear with more inclusive selectors */
[data-bubble-type="purple"].hide-behind-cards[style*="top: 15"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 16"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 17"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 18"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 19"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 20"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 21"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 22"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 23"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 24"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 25"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 26"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 27"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 28"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 29"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 30"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 31"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 32"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 33"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 34"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 35"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 36"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 37"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 38"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 39"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 40"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 41"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 42"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 43"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 44"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 45"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 46"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 47"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 48"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 49"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 50"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 51"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 52"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 53"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 54"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 55"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 56"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 57"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 58"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 59"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 60"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 61"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 62"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 63"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 64"],
[data-bubble-type="purple"].hide-behind-cards[style*="top: 65"] {
  opacity: 0 !important; /* Force complete invisibility */
}

/* Fade transform effect - applied to non-purple bubbles */
.fade-transform-effect {
  transition: all 0.8s ease-in-out;
  opacity: 0.1; /* Start faded out */
  background: linear-gradient(to bottom right, #8b5cf6, #6366f1) !important; /* Start as purple */
}

/* Star transitions - fade in with yellow color around cards */
.bubble-star.star-transition.fade-transform-effect:hover {
  box-shadow: 0 8px 15px rgba(255, 204, 0, 0.3);
}

/* Star bubbles at cards level - fade out completely */
.bubble-star.star-transition.fade-transform-effect[style*="top: 15"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 16"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 17"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 18"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 19"] {
  opacity: 0 !important;
  transition: opacity 0.5s ease-out, background 0.5s ease-out;
}

/* Star bubbles just after cards - transition to yellow/amber */
.bubble-star.star-transition.fade-transform-effect[style*="top: 20"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 21"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 22"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 23"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 24"] {
  background: linear-gradient(to bottom right, #ffd700, #ffaa00) !important;
  box-shadow: 0 4px 12px rgba(255, 204, 0, 0.25);
  opacity: 0.7;
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-star.star-transition.fade-transform-effect[style*="top: 25"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 26"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 27"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 28"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 29"] {
  background: linear-gradient(to bottom right, #ffd700, #ffaa00) !important;
  box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
  opacity: 0.75;
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-star.star-transition.fade-transform-effect[style*="top: 30"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 31"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 32"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 33"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 34"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 35"] {
  background: linear-gradient(to bottom right, #ffcc00, #ff9900) !important;
  box-shadow: 0 4px 12px rgba(255, 180, 0, 0.35);
  opacity: 0.8;
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-star.star-transition.fade-transform-effect[style*="top: 36"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 37"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 38"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 39"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 40"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 41"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 42"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 43"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 44"],
.bubble-star.star-transition.fade-transform-effect[style*="top: 45"] {
  background: linear-gradient(to bottom right, #ffbc00, #ff8800) !important;
  box-shadow: 0 4px 12px rgba(255, 150, 0, 0.4);
  opacity: 0.85;
  z-index: 5; /* Ensure these bubbles appear above cards */
}

/* Flame transitions - allow pass through */
.bubble-flame.flame-transition.fade-transform-effect:hover {
  box-shadow: 0 8px 15px rgba(255, 80, 0, 0.3);
}

/* Flame bubbles at cards level - fade out completely */
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 15"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 16"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 17"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 18"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 19"] {
  opacity: 0 !important;
  transition: opacity 0.5s ease-out, background 0.5s ease-out;
}

/* Flame bubbles at specified positions transition to red/orange */
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 20"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 21"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 22"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 23"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 24"] {
  background: linear-gradient(to bottom right, #ff4500, #ff7800) !important;
  box-shadow: 0 4px 12px rgba(255, 80, 0, 0.25);
  opacity: 0.7;
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-flame.flame-transition.fade-transform-effect[style*="top: 25"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 26"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 27"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 28"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 29"] {
  background: linear-gradient(to bottom right, #ff4500, #ff7800) !important;
  box-shadow: 0 4px 12px rgba(255, 80, 0, 0.3);
  opacity: 0.75;
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-flame.flame-transition.fade-transform-effect[style*="top: 30"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 31"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 32"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 33"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 34"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 35"] {
  background: linear-gradient(to bottom right, #ff3300, #ff6600) !important;
  box-shadow: 0 4px 12px rgba(255, 60, 0, 0.35);
  opacity: 0.8;
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-flame.flame-transition.fade-transform-effect[style*="top: 36"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 37"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 38"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 39"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 40"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 41"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 42"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 43"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 44"],
.bubble-flame.flame-transition.fade-transform-effect[style*="top: 45"] {
  background: linear-gradient(to bottom right, #ff2500, #ff5500) !important;
  box-shadow: 0 4px 12px rgba(255, 40, 0, 0.4);
  opacity: 0.85;
  z-index: 5; /* Ensure these bubbles appear above cards */
}
`;
