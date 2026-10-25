/** Tenaville Tailwind preset (Tailwind 3.4+). Import tokens.css once in your app. */
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
      'bg': 'rgb(var(--tv-bg) / <alpha-value>)',
      'surface': 'rgb(var(--tv-surface) / <alpha-value>)',
      'surface2': 'rgb(var(--tv-surface2) / <alpha-value>)',
      'border': 'rgb(var(--tv-border) / <alpha-value>)',
      'border-strong': 'rgb(var(--tv-border-strong) / <alpha-value>)',
      'text': 'rgb(var(--tv-text) / <alpha-value>)',
      'muted': 'rgb(var(--tv-muted) / <alpha-value>)',
      'subtle': 'rgb(var(--tv-subtle) / <alpha-value>)',
      'primary': 'rgb(var(--tv-primary) / <alpha-value>)',
      'primary-hover': 'rgb(var(--tv-primary-hover) / <alpha-value>)',
      'primary-soft': 'rgb(var(--tv-primary-soft) / <alpha-value>)',
      'on-primary': 'rgb(var(--tv-on-primary) / <alpha-value>)',
      'accent': 'rgb(var(--tv-accent) / <alpha-value>)',
      'accent-hover': 'rgb(var(--tv-accent-hover) / <alpha-value>)',
      'accent-soft': 'rgb(var(--tv-accent-soft) / <alpha-value>)',
      'on-accent': 'rgb(var(--tv-on-accent) / <alpha-value>)',
      'success-soft': 'rgb(var(--tv-success-soft) / <alpha-value>)',
      'success-text': 'rgb(var(--tv-success-text) / <alpha-value>)',
      'warning-soft': 'rgb(var(--tv-warning-soft) / <alpha-value>)',
      'warning-text': 'rgb(var(--tv-warning-text) / <alpha-value>)',
      'danger': 'rgb(var(--tv-danger) / <alpha-value>)',
      'danger-soft': 'rgb(var(--tv-danger-soft) / <alpha-value>)',
      'danger-text': 'rgb(var(--tv-danger-text) / <alpha-value>)',
      'info-soft': 'rgb(var(--tv-info-soft) / <alpha-value>)',
      'info-text': 'rgb(var(--tv-info-text) / <alpha-value>)',
      'ring': 'rgb(var(--tv-ring) / <alpha-value>)',
      brand: {"50": "#F2F6FD", "100": "#E4EDFA", "200": "#C3D8F5", "300": "#8DB4EA", "400": "#4B84D4", "500": "#1F5BB5", "600": "#0C4192", "700": "#0A3A80", "800": "#062B5F", "900": "#04204A"}, green: {"50": "#F1FBF8", "100": "#E1F6F0", "200": "#BFEBDF", "300": "#7ED6BF", "400": "#34BC9A", "500": "#049A78", "600": "#067A60", "700": "#046B54", "800": "#055344", "900": "#043A30"}, slate: {"50": "#F6F8FB", "100": "#EDF0F5", "200": "#DEE3EC", "300": "#C2CAD8", "400": "#94A0B5", "500": "#6B7790", "600": "#475572", "700": "#2D3950", "800": "#1C2638", "900": "#121A2B", "950": "#0B1220"}
      },
      fontFamily: { display: ['"Plus Jakarta Sans"','Inter','system-ui','sans-serif'], sans: ['Inter','system-ui','sans-serif'] },
      fontSize: { xs:['12px','16px'], sm:['13px','20px'], base:['15px','24px'], lg:['18px','26px'], xl:['20px','28px'], '2xl':['24px','32px'], '3xl':['30px','38px'], '4xl':['36px','44px'] },
      borderRadius: { sm:'6px', md:'10px', lg:'14px', xl:'20px' },
      boxShadow: { sm:'var(--tv-shadow-sm)', md:'var(--tv-shadow-md)', lg:'var(--tv-shadow-lg)' }
    }
  }
};
