module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#1d4037', muted: '#456459', page: '#f0f5ed', paper: '#fafcf7',
        forest: { 900: '#1d4037', 700: '#3c6657' },
        lime: { 400: '#def3a8' },
        mint: { 100: '#e0eddf', 200: '#c7e4c9', 300: '#acccaf' },
      },
      fontFamily: { sans: ['Roboto_400Regular'], semibold: ['Roboto_600SemiBold'], bold: ['Roboto_700Bold'] },
    },
  },
  plugins: [],
};

