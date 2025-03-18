import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  safelist: [
    'from-teal-500',
    'to-teal-600',
    'from-red-500',
    'to-red-600',
    'from-amber-500',
    'to-amber-600',
    'from-purple-400',
    'to-indigo-500',
    'blur-xl',
    'blur-2xl',
    'animate-pulse-beam',
    'animate-glow-beam',
    'ray-rotate',
    'sunray',
    'sunray-beam',
    'sunray-container',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' }
        },
        'energy-glow': {
          '0%, 100%': { 
            opacity: '0.6',
            transform: 'scale(0.95)'
          },
          '50%': { 
            opacity: '0.85',
            transform: 'scale(1.05)'
          }
        },
        'flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' }
        },
        'flip-back': {
          '0%': { transform: 'rotateY(180deg)' },
          '100%': { transform: 'rotateY(0deg)' }
        },
        'blob': {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)'
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)'
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)'
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)'
          }
        },
        'pulse-beam': {
          '0%': {
            opacity: '0.6',
            transform: 'scaleX(0.9) scaleY(0.95)'
          },
          '50%': {
            opacity: '0.8', 
            transform: 'scaleX(1.1) scaleY(1.05)'
          },
          '100%': {
            opacity: '0.6',
            transform: 'scaleX(0.9) scaleY(0.95)'
          }
        },
        'glow-beam': {
          '0%': {
            opacity: '0.4',
            transform: 'scaleX(0.85) scaleY(0.9)'
          },
          '50%': {
            opacity: '0.7',
            transform: 'scaleX(1.15) scaleY(1.1)'
          },
          '100%': {
            opacity: '0.4',
            transform: 'scaleX(0.85) scaleY(0.9)'
          }
        },
        'ray-rotate': {
          '0%': {
            transform: 'rotate(0deg)'
          },
          '100%': {
            transform: 'rotate(360deg)'
          }
        },
        'ray-pulse': {
          '0%': {
            opacity: '0.3',
            transform: 'scale(0.95) translateY(-5px)'
          },
          '50%': {
            opacity: '0.7',
            transform: 'scale(1.05) translateY(0)'
          },
          '100%': {
            opacity: '0.3',
            transform: 'scale(0.95) translateY(-5px)'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
        'energy-glow': 'energy-glow 3s ease-in-out infinite',
        'flip': 'flip 0.6s ease-out forwards',
        'flip-back': 'flip-back 0.6s ease-out forwards',
        'blob': 'blob 7s infinite',
        'pulse-beam': 'pulse-beam 4s ease-in-out infinite',
        'glow-beam': 'glow-beam 6s ease-in-out infinite',
        'ray-rotate': 'ray-rotate 120s linear infinite',
        'ray-pulse': 'ray-pulse 4s infinite ease-in-out',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'inherit',
              textDecoration: 'underline',
              fontWeight: '500'
            },
            strong: {
              color: 'inherit',
              fontWeight: '600'
            },
            code: {
              color: 'inherit',
              fontWeight: '400'
            },
            p: {
              marginTop: '0.5em',
              marginBottom: '0.5em'
            }
          }
        }
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"),
    require('@tailwindcss/typography')
  ],
} satisfies Config;
