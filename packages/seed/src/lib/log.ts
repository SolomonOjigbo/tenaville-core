const stamp = (): string => new Date().toISOString().slice(11, 19);

export const log = {
  info: (message: string): void => console.log(`${stamp()}  ${message}`),
  step: (message: string): void => console.log(`\n${stamp()}  ── ${message}`),
  warn: (message: string): void => console.warn(`${stamp()}  ! ${message}`),
  progress: (label: string, done: number, total: number): void => {
    if (total === 0) return;
    const every = Math.max(1, Math.floor(total / 10));
    if (done === total || done % every === 0) {
      console.log(`${stamp()}    ${label}: ${done}/${total}`);
    }
  },
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `task` over `items` with bounded concurrency. Order of *completion* is
 * not guaranteed; callers that need ordered writes (payments, which take
 * receipt numbers in call order) must not use this.
 */
export const mapLimit = async <T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index] as T, index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

/** Retry a flaky call (network blips, auth rate limits) with backoff. */
export const withRetry = async <T>(
  label: string,
  fn: () => Promise<T>,
  { attempts = 4, baseMs = 1_500 }: { attempts?: number; baseMs?: number } = {},
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const wait = baseMs * 2 ** (attempt - 1);
      log.warn(`${label} failed (attempt ${attempt}/${attempts}); retrying in ${wait}ms`);
      await sleep(wait);
    }
  }
  throw lastError;
};
