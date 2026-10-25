import { useColorScheme } from 'react-native';

import { themeFor, type TenavilleTheme } from '@tenaville/ui/native';

/**
 * The Tenaville theme for the current device appearance.
 *
 * The themes themselves live in @tenaville/ui so the web app and the token
 * drift test can reach them; only this hook needs react-native.
 */
export const useTenavilleTheme = (): TenavilleTheme => themeFor(useColorScheme());

export type { TenavilleTheme };
