import { describe, expect, it } from 'vitest';

import { errorMessage, fieldErrorsFrom } from '../lib/form-errors';

describe('fieldErrorsFrom', () => {
  it('maps the first issue per field to a message', () => {
    const error = {
      issues: [
        { path: ['name'], message: 'Enter the property name' },
        { path: ['name'], message: 'Second message is ignored' },
        { path: ['stateCode'], message: 'Use a two-letter code' },
      ],
    };
    expect(fieldErrorsFrom(error)).toEqual({
      name: 'Enter the property name',
      stateCode: 'Use a two-letter code',
    });
  });

  it('returns null for errors that are not validation issues', () => {
    expect(fieldErrorsFrom(new Error('database unreachable'))).toBeNull();
    expect(fieldErrorsFrom('nope')).toBeNull();
    expect(fieldErrorsFrom({ issues: [] })).toBeNull();
    expect(fieldErrorsFrom({ issues: [{ path: [0], message: 'array item' }] })).toBeNull();
  });
});

describe('errorMessage', () => {
  it('uses the error message when there is one, and the fallback otherwise', () => {
    expect(errorMessage(new Error('charge already exists'), 'fallback')).toBe(
      'charge already exists',
    );
    expect(errorMessage(new Error('   '), 'fallback')).toBe('fallback');
    expect(errorMessage(null, 'fallback')).toBe('fallback');
  });
});
