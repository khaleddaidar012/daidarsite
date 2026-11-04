/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "../shared/**/*.{js,ts,jsx,tsx}",
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        slate: {
          850: '#152238',
        },
        daidar: {
          blue: '#0084d6',
          blueHover: '#0074bd',
          navy: '#0e1f38',
          navyHover: '#152a4a',
          cyan: '#00b4d8',
          cyanLight: '#38bdf8',
          pill: '#e6f4fe',
          cardBlue: '#f0f7ff',
          bg: '#f7fafe',
        }
      }
    },
  },
  plugins: [],
}
