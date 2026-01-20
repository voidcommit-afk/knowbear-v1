/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                dark: {
                    900: '#0a0a0a',
                    800: '#121212',
                    700: '#1a1a1a',
                    600: '#242424',
                    500: '#2d2d2d',
                },
                accent: {
                    green: '#22c55e',
                    teal: '#14b8a6',
                    orange: '#f97316',
                    red: '#ef4444',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
