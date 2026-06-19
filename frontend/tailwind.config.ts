import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#66bb6a',
          hover: '#57a85b',
          light: '#e8f5e9',
        },
        accent: {
          DEFAULT: '#0779e4',
          hover: '#065fc0',
        },
        sidebar: {
          bg: '#1c2636',
          hover: '#263044',
          active: '#2e3d56',
          border: '#2a3547',
          text: '#8b9bb4',
          textActive: '#ffffff',
        },
        surface: {
          bg: '#f4f6f9',
          card: '#ffffff',
          border: '#e0e0e0',
        },
        text: {
          dark: '#1a2332',
          medium: '#4a5568',
          light: '#8b9bb4',
        },
        status: {
          new: '#0779e4',
          active: '#66bb6a',
          pending: '#f59e0b',
          done: '#6b7280',
          cancelled: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        common: '10px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}

export default config
