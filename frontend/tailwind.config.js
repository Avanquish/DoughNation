/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",               
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {
      colors: {
        success: '#16a34a', 
        warning: '#facc15', 
        destructive: '#dc2626', 
        bakery: '#a16207',     
        charity: '#0284c7',    
      }
    },
  },
  plugins: [],
};
