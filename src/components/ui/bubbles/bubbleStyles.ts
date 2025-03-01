
export const bubbleAnimationStyles = `
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

/* Star transitions - allow pass through */
.bubble-star.star-transition.pass-through-left:hover {
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
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-star.star-transition[style*="top: 25"],
.bubble-star.star-transition[style*="top: 26"],
.bubble-star.star-transition[style*="top: 27"],
.bubble-star.star-transition[style*="top: 28"],
.bubble-star.star-transition[style*="top: 29"] {
  background: linear-gradient(to bottom right, #ffd700, #ffaa00);
  box-shadow: 0 4px 12px rgba(255, 204, 0, 0.3);
  opacity: 0.75;
  z-index: 5; /* Ensure these bubbles appear above cards */
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
  z-index: 5; /* Ensure these bubbles appear above cards */
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
  z-index: 5; /* Ensure these bubbles appear above cards */
}

/* Flame transitions - allow pass through */
.bubble-flame.flame-transition.pass-through-right:hover {
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
  z-index: 5; /* Ensure these bubbles appear above cards */
}

.bubble-flame.flame-transition[style*="top: 25"],
.bubble-flame.flame-transition[style*="top: 26"],
.bubble-flame.flame-transition[style*="top: 27"],
.bubble-flame.flame-transition[style*="top: 28"],
.bubble-flame.flame-transition[style*="top: 29"] {
  background: linear-gradient(to bottom right, #ff4500, #ff7800);
  box-shadow: 0 4px 12px rgba(255, 80, 0, 0.3);
  opacity: 0.75;
  z-index: 5; /* Ensure these bubbles appear above cards */
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
  z-index: 5; /* Ensure these bubbles appear above cards */
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
  z-index: 5; /* Ensure these bubbles appear above cards */
}
`;
