export const DEVICE_COOKIE = 'tenaville-device';

/** A browser is asked to identify itself for a year; revocation is server-side. */
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Sessions idle for longer than this are refused at the middleware boundary. */
export const SESSION_IDLE_DAYS = 30;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isDeviceKey = (value: string | undefined): value is string =>
  value !== undefined && UUID.test(value);

/**
 * A human label for a user agent.
 *
 * Deliberately small: the point is for a person to recognise "Chrome on
 * Windows" in a session list, not to fingerprint the browser.
 */
export const deviceLabel = (userAgent: string | null): string => {
  if (userAgent === null || userAgent.trim() === '') return 'Unknown browser';

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'Browser';

  const platform = /iPhone|iPad|iPod/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Windows/.test(userAgent)
        ? 'Windows'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : 'unknown device';

  return `${browser} on ${platform}`;
};
