/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Escala celeste oficial. Anclas: 100 #b6ffff, 200 #7cdaf9, 500 #0cb7f2.
        // Documento canónico: specs-cevicheria-lucy/docs/design-system.md
        brand: {
          50: '#eefcff',
          100: '#b6ffff',
          200: '#7cdaf9',
          300: '#4ed0f7',
          400: '#25c5f5',
          500: '#0cb7f2',
          600: '#0891c4',
          700: '#077093',
          800: '#0a5874',
          900: '#0b475d',
          950: '#052e3d'
        }
      }
    }
  },
  plugins: []
};
