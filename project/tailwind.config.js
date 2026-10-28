import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow', ...defaultTheme.fontFamily.sans],
        condensed: ['"Barlow Condensed"', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        accent: '#C6FF00',
      },
    },
  },
  plugins: [],
};
