/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          950: '#0F150F',
          900: '#161E16',
          850: '#1C261B',
          800: '#222F21',
          750: '#2A3A29',
          700: '#344733',
          600: '#4D684B',
          400: '#8A9E88',
          200: '#D2DDD1',
          100: '#E8EFE8',
          50: '#F4F7F4'
        },
        canvas: {
          50: '#FFFFFF',
          100: '#FBF9F5',
          200: '#F6F3EC',
          300: '#ECE7DD',
          400: '#DED7CA',
          border: '#E8E3D9',
          card: '#FFFFFF'
        },
        terracotta: {
          50: '#FDF4F0',
          100: '#F9E4DB',
          200: '#F3C4B3',
          300: '#EA9E85',
          400: '#E07555',
          500: '#D85836',
          600: '#C44422',
          700: '#A33316',
          800: '#832812',
          900: '#68200E'
        },
        sage: {
          50: '#F2F7F3',
          100: '#E2EFE5',
          200: '#C2DEC8',
          500: '#3D8A58',
          700: '#265C38',
          800: '#1C4329'
        },
        brand: {
          50: '#FDF4F0',
          100: '#F9E4DB',
          500: '#D85836',
          600: '#C44422',
          700: '#A33316'
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.06), 0 2px 4px 0 rgba(0, 0, 0, 0.03)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }
    },
  },
  plugins: [],
}
