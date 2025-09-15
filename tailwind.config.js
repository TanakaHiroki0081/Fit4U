/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#A60311',
        secondary: '#333333',
        'default-bg': '#E0E0E0',
        'default-text': '#333333',
        'light-gray': '#999999',
      },
      fontFamily: {
        'sans': ['Noto Sans JP', 'Rounded M+', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        '3xl': '0 35px 60px -12px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};
