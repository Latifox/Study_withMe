
export interface Bubble {
  id: number;
  size: number;
  position: { 
    left?: string; 
    right?: string; 
    top: string 
  };
  opacity: number;
  gradient: string;
  animationDuration: string;
  transitionDuration: string;
  type: 'star' | 'flame';
}

export interface BubbleProps {
  bubble: Bubble;
  additionalClasses: string;
}
