
import React from 'react';

type SectionDividerProps = {
  position: 'top' | 'bottom';
  variant?: 'purple-blue' | 'blue-purple' | 'indigo-purple' | 'purple-indigo' | 'white-purple' | 'purple-white';
  height?: number;
  className?: string;
};

const SectionDivider = ({ 
  position, 
  variant = 'purple-blue', 
  height = 80,
  className = '' 
}: SectionDividerProps) => {
  
  // Define different gradient styles
  const gradientVariants = {
    'purple-blue': 'from-purple-900 to-blue-900',
    'blue-purple': 'from-blue-900 to-purple-900',
    'indigo-purple': 'from-indigo-900 to-purple-900',
    'purple-indigo': 'from-purple-900 to-indigo-900',
    'white-purple': 'from-white to-purple-900',
    'purple-white': 'from-purple-900 to-white',
  };
  
  const selectedGradient = gradientVariants[variant];
  
  // Determine the style based on position
  const positionStyles = position === 'top' 
    ? {
        top: 0,
        background: `linear-gradient(to bottom, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)`,
      } 
    : {
        bottom: 0,
        background: `linear-gradient(to top, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 100%)`,
      };
  
  return (
    <div 
      className={`absolute left-0 w-full pointer-events-none ${selectedGradient} opacity-90 ${className}`}
      style={{ 
        ...positionStyles,
        height: `${height}px`,
        zIndex: 1
      }}
    />
  );
};

export default SectionDivider;
