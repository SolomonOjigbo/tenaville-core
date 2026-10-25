/**
 * Tenaville design tokens, platform-neutral.
 *
 * `tokens.json` is the single source of truth, shipped by the Tenaville UI kit.
 * This module types it and re-exports it, so web and mobile consume the same
 * values rather than two hand-copied palettes.
 *
 * The kit ships three representations of the same colours — `tokens.json`,
 * `tokens/tokens.css` for the web, and `native/theme.ts` for React Native.
 * They will drift unless something checks them, so `__tests__/tokens.test.ts`
 * asserts all three agree on every semantic colour.
 */
import tokens from './tokens/tokens.json' with { type: 'json' };

export const designTokens = tokens;

export type ColorScheme = 'light' | 'dark';

/** Semantic colour roles — what a colour is *for*, not what it looks like. */
export type SemanticColor = keyof typeof tokens.color.semantic.light;

export const semanticColors = (scheme: ColorScheme): Record<SemanticColor, string> =>
  tokens.color.semantic[scheme];

export const colorScales = tokens.color.scales;
export const fontFamilies = tokens.font;
export const fontSizes = tokens.fontSize;
export const spacing = tokens.spacing;
export const radii = tokens.radius;
export const shadows = tokens.shadow;
export const motion = tokens.motion;

/**
 * Minimum touch target, in density-independent pixels.
 *
 * 44 is not decoration: PRD principle 6 and §12 require core field workflows to
 * be usable one-handed by a caretaker standing in a compound, and the staff app
 * is where a payment gets recorded.
 */
export const touchTargetMin = tokens.touchTargetMin;

/** The CSS variable name for a semantic colour, e.g. `--tv-primary`. */
export const cssVar = (color: SemanticColor): string => `--tv-${color}`;

/**
 * A semantic colour as a CSS `rgb()` reference.
 *
 * The variables hold space-separated R G B channels rather than hex, so
 * Tailwind's opacity modifiers (`bg-primary/10`) work against them.
 */
export const cssColor = (color: SemanticColor, alpha?: number): string =>
  alpha === undefined ? `rgb(var(${cssVar(color)}))` : `rgb(var(${cssVar(color)}) / ${alpha})`;
