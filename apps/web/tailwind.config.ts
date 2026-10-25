import type { Config } from 'tailwindcss';

// The preset is the Tenaville UI kit's: it maps Tailwind's colour names onto
// the --tv-* CSS variables, so `bg-surface` and `text-muted` resolve to the
// kit's palette and opacity modifiers like `bg-primary/10` work.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the preset is CJS
const tenavillePreset = require('@tenaville/ui/tailwind') as Config;

export default {
  presets: [tenavillePreset],
  content: ['./src/**/*.{ts,tsx}'],
} satisfies Config;
