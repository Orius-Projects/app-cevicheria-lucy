/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta marina vibrante: turquesas oceánicos, profundidades marinas y azul marino
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#082f49'
        },
        marine: {
          700: '#132a48',
          800: '#0b192c',
          850: '#081524',
          900: '#06101e',
          950: '#030811'
        }
      }
    }
  },
  plugins: []
};
