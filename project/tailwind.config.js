import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        condensed: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        canvas: '#1A1A1A',
        card: '#242424',
        input: '#2E2E2E',
        ink: '#F5F5F5',
        muted: '#8E8E93',
        accent: '#2F80ED',
        done: '#27AE60',
        warmup: '#F2C94C',
      },
    },
  },
  plugins: [],
};
