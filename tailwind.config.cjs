/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces — warm-neutral charcoal ramp
        'background':              '#1f1b17',
        'surface':                 '#1f1b17',
        'surface-dim':             '#1f1b17',
        'surface-bright':          '#4a4138',
        'surface-variant':         '#413931',
        'surface-container-lowest':'#181512',
        'surface-container-low':   '#262119',
        'surface-container':       '#2c2620',
        'surface-container-high':  '#362f27',
        'surface-container-highest':'#413931',

        // Primary — clay (brand signal)
        'primary':                 '#f1e4d8',
        'primary-container':       '#d97757',
        'primary-fixed':           '#e9a98e',
        'primary-fixed-dim':       '#c4654a',
        'surface-tint':            '#c2613f',
        'inverse-primary':         '#7a3a26',
        'on-primary':              '#3a190d',
        'on-primary-container':    '#2e1108',
        'on-primary-fixed':        '#24100a',

        // Secondary — rose-taupe
        'secondary':               '#e0b3a3',
        'secondary-container':     '#6e3a2a',
        'secondary-fixed':         '#f2d8cd',
        'secondary-fixed-dim':     '#e0b3a3',
        'on-secondary':            '#461f14',
        'on-secondary-container':  '#f2d3c8',
        'on-secondary-fixed':      '#31130b',

        // Tertiary — sand (replaces yellow)
        'tertiary':                '#f3ead9',
        'tertiary-container':      '#d9c19b',
        'tertiary-fixed':          '#e8d4b2',
        'on-tertiary':             '#41331c',
        'on-tertiary-container':   '#5f4c2e',

        // Error — warm clay-red
        'error':                   '#f2b8ae',
        'error-container':         '#8c2f23',
        'on-error':                '#5f1409',
        'on-error-container':      '#ffdad4',

        // Foreground / text
        'on-surface':              '#efe6da',
        'on-background':           '#efe6da',
        'on-surface-variant':      '#cdbcab',
        'inverse-surface':         '#efe6da',
        'inverse-on-surface':      '#312a22',

        // Outlines
        'outline':                 '#998877',
        'outline-variant':         '#4c4135',
      },
      fontFamily: {
        headline: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },
      boxShadow: {
        'glow-clay-sm': '0 0 12px rgba(217, 119, 87, 0.30)',
        'glow-clay-md': '0 0 16px rgba(217, 119, 87, 0.24), inset 0 0 8px rgba(217, 119, 87, 0.08)',
        'glow-clay-lg': '0 0 20px rgba(217, 119, 87, 0.10)',
        'glow-cta':     '0 4px 18px rgba(194, 97, 63, 0.22)',
        'card':         '0 4px 12px rgba(0, 0, 0, 0.30)',
        'modal':        '0 0 80px rgba(0, 0, 0, 0.80)',
      },
    },
  },
  plugins: [],
};
