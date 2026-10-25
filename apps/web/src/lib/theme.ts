/**
 * Theme preference: light, dark, or follow the device.
 *
 * The CSS does the work — `tokens.css` defines the palette on `:root`, swaps it
 * under `[data-theme="dark"]`, and swaps it again under
 * `prefers-color-scheme: dark` guarded by `:not([data-theme="light"])`. So the
 * only job here is to persist the choice and stamp the attribute.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'tenaville-theme';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

/**
 * The attribute value for a preference. `system` stamps nothing, which is what
 * lets the `prefers-color-scheme` block apply.
 */
export const themeAttribute = (preference: ThemePreference): 'light' | 'dark' | null =>
  preference === 'system' ? null : preference;

export const applyTheme = (preference: ThemePreference): void => {
  const attribute = themeAttribute(preference);
  const root = document.documentElement;
  if (attribute === null) root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', attribute);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private browsing and blocked site data both throw here. A remembered
    // theme is a convenience, not a requirement, so losing it is acceptable —
    // crashing the page over it is not.
  }
};

export const storedTheme = (): ThemePreference => {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(value) ? value : 'system';
  } catch {
    return 'system';
  }
};

/**
 * Inlined in the document head so the attribute is set before first paint.
 *
 * Without this the page renders light and then flips, which is worse than
 * either theme on its own.
 */
export const THEME_INIT_SCRIPT = `
(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');
if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
`.trim();
