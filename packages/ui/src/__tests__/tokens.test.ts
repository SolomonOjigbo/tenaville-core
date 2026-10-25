import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { darkTheme, lightTheme } from '../native/theme.js';
import {
  cssColor,
  cssVar,
  designTokens,
  semanticColors,
  touchTargetMin,
  type SemanticColor,
} from '../tokens.js';

const here = dirname(fileURLToPath(import.meta.url));
const tokensCss = readFileSync(join(here, '../tokens/tokens.css'), 'utf8');

/** `#AABBCC` -> `170 187 204`, the space-separated channel form the CSS uses. */
const hexToChannels = (hex: string): string => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (m === null) throw new Error(`${hex} is not a six-digit hex colour`);
  const v = m[1]!;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)).join(' ');
};

/** Read one CSS variable out of a given block of tokens.css. */
const cssVarValue = (block: string, name: string): string | undefined =>
  new RegExp(`--${name}:([^;]+);`).exec(block)?.[1]?.trim();

const blockFor = (selector: string): string => {
  const index = tokensCss.indexOf(selector);
  if (index === -1) throw new Error(`no ${selector} block in tokens.css`);
  const open = tokensCss.indexOf('{', index);
  const close = tokensCss.indexOf('}', open);
  return tokensCss.slice(open, close);
};

const SCHEMES = [
  { scheme: 'light' as const, selector: ':root{' },
  { scheme: 'dark' as const, selector: '[data-theme="dark"]' },
];

describe('design tokens', () => {
  it('defines the same semantic roles in light and dark', () => {
    // A role present in one scheme and missing in the other renders as
    // "transparent" in exactly one theme, which is the kind of bug nobody sees
    // until a user switches.
    expect(Object.keys(designTokens.color.semantic.light).sort()).toEqual(
      Object.keys(designTokens.color.semantic.dark).sort(),
    );
  });

  it('uses six-digit hex throughout, so channel conversion is unambiguous', () => {
    for (const scheme of ['light', 'dark'] as const) {
      for (const [role, value] of Object.entries(semanticColors(scheme))) {
        expect(value, `${scheme}.${role}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe('tokens.css agrees with tokens.json', () => {
  // The CSS is a second representation of the same palette. Without this, a
  // colour corrected in one place silently stays wrong in the other.
  for (const { scheme, selector } of SCHEMES) {
    it(`matches every ${scheme} semantic colour`, () => {
      const block = blockFor(selector);
      const mismatches: string[] = [];

      for (const [role, hex] of Object.entries(semanticColors(scheme))) {
        const actual = cssVarValue(block, `tv-${role}`);
        const expected = hexToChannels(hex);
        if (actual !== expected) {
          mismatches.push(
            `--tv-${role}: css has "${actual ?? 'nothing'}", json says "${expected}" (${hex})`,
          );
        }
      }

      expect(mismatches).toEqual([]);
    });
  }

  it('carries a system-dark block, so the default appearance follows the device', () => {
    expect(tokensCss).toContain('prefers-color-scheme: dark');
    // Guarded so an explicit light choice still wins over the system setting.
    expect(tokensCss).toContain(':root:not([data-theme="light"])');
  });
});

describe('native theme agrees with tokens.json', () => {
  // The React Native themes are the third representation. Colour keys there use
  // underscores where CSS and JSON use hyphens.
  const toNativeKey = (role: string) => role.replace(/-/g, '_');

  for (const { scheme } of SCHEMES) {
    it(`matches every ${scheme} semantic colour`, () => {
      const native = (scheme === 'light' ? lightTheme : darkTheme).colors as Record<string, string>;
      const mismatches: string[] = [];

      for (const [role, hex] of Object.entries(semanticColors(scheme))) {
        const key = toNativeKey(role);
        const actual = native[key];
        if (actual === undefined) {
          mismatches.push(`${scheme}.${key} is missing from the native theme`);
        } else if (actual.toUpperCase() !== hex.toUpperCase()) {
          mismatches.push(`${scheme}.${key}: native has ${actual}, json says ${hex}`);
        }
      }

      expect(mismatches).toEqual([]);
    });
  }

  it('shares the spacing, radius and touch target scales', () => {
    expect(lightTheme.spacing).toMatchObject(
      Object.fromEntries(Object.entries(designTokens.spacing).filter(([k]) => k !== '16')),
    );
    expect(lightTheme.radius).toEqual(designTokens.radius);
    expect(lightTheme.touchTarget).toBe(touchTargetMin);
  });

  it('formats money with tabular figures', () => {
    // Proportional digits make a column of naira amounts impossible to scan,
    // and a rent roll is read as a column (PRD §12 accessibility).
    expect(lightTheme.text.money.fontVariant).toContain('tabular-nums');
  });
});

describe('css helpers', () => {
  it('builds variable references Tailwind opacity can modify', () => {
    expect(cssVar('primary')).toBe('--tv-primary');
    expect(cssColor('primary')).toBe('rgb(var(--tv-primary))');
    expect(cssColor('primary', 0.1)).toBe('rgb(var(--tv-primary) / 0.1)');
  });

  it('types every semantic role', () => {
    const roles: SemanticColor[] = ['bg', 'surface', 'text', 'primary', 'danger', 'ring'];
    for (const role of roles) expect(cssVar(role)).toBe(`--tv-${role}`);
  });
});
