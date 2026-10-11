/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#e0ecff',
          200: '#c7dcfe',
          300: '#a0c4fd',
          400: '#70a2fb',
          500: '#437bf6',
          600: '#255deb',
          700: '#1d48d8',
          800: '#1e3cb0',
          900: '#1e368a',
          950: '#172354',
        },
      },
    },
  },
  plugins: [],
}
