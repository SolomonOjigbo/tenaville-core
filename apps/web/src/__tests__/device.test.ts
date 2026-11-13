import { describe, expect, it } from 'vitest';

import { deviceLabel, isDeviceKey } from '../lib/device';

describe('deviceLabel', () => {
  it('names a recognisable browser and platform', () => {
    expect(
      deviceLabel(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      ),
    ).toBe('Chrome on Windows');
  });

  it('recognises mobile platforms before desktop tokens', () => {
    expect(
      deviceLabel(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
      ),
    ).toBe('Safari on iOS');
  });

  it('falls back rather than returning an empty label', () => {
    expect(deviceLabel(null)).toBe('Unknown browser');
  });
});

describe('isDeviceKey', () => {
  it('accepts the UUID shape the cookie uses', () => {
    expect(isDeviceKey('4f9d9e1c-4c68-4a0f-9a46-0f2a4f4c8e9a')).toBe(true);
  });

  it('rejects a forged or truncated value', () => {
    expect(isDeviceKey('not-a-device')).toBe(false);
    expect(isDeviceKey(undefined)).toBe(false);
  });
});
