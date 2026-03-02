/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Syne', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        bg: '#080c14',
        surface: '#0d1422',
        surface2: '#111827',
        border: '#1e2d45',
        accent: '#00d4ff',
        accent2: '#7c3aed',
        accent3: '#10b981',
        accent4: '#f59e0b',
      },
    },
  },
  plugins: [],
}