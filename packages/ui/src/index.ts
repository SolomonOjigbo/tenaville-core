/**
 * Shared design tokens and primitives.
 *
 * Tokens are platform-neutral and safe to import anywhere. Web primitives are
 * added here as screens are built (TV-007); the React Native themes are at
 * `@tenaville/ui/native`, and apps/mobile wraps them in a hook because only it
 * depends on react-native.
 */
export {
  designTokens,
  semanticColors,
  colorScales,
  fontFamilies,
  fontSizes,
  spacing,
  radii,
  shadows,
  motion,
  touchTargetMin,
  cssVar,
  cssColor,
  type ColorScheme,
  type SemanticColor,
} from './tokens';
