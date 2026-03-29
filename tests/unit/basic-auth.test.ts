import { describe, expect, it } from 'vitest';
import {
  isBasicAuthAuthorized,
  resolveBasicAuthConfig,
} from '../../lib/basic-auth';

describe('resolveBasicAuthConfig', () => {
  it('disables auth outside production when credentials are missing', () => {
    expect(
      resolveBasicAuthConfig({ NODE_ENV: 'development' }),
    ).toEqual({ mode: 'disabled' });
  });

  it('enables auth when both credentials are present', () => {
    expect(
      resolveBasicAuthConfig({
        NODE_ENV: 'production',
        BASIC_AUTH_USERNAME: 'admin',
        BASIC_AUTH_PASSWORD: 'secret',
      }),
    ).toEqual({
      mode: 'enabled',
      username: 'admin',
      password: 'secret',
    });
  });

  it('marks production as misconfigured when credentials are missing', () => {
    expect(
      resolveBasicAuthConfig({ NODE_ENV: 'production' }),
    ).toEqual({ mode: 'misconfigured' });
  });

  it('allows an explicit auth bypass flag', () => {
    expect(
      resolveBasicAuthConfig({
        NODE_ENV: 'production',
        APP_AUTH_DISABLED: 'true',
      }),
    ).toEqual({ mode: 'disabled' });
  });
});

describe('isBasicAuthAuthorized', () => {
  it('accepts valid basic auth credentials', () => {
    const header = `Basic ${btoa('admin:secret')}`;
    expect(isBasicAuthAuthorized(header, 'admin', 'secret')).toBe(true);
  });

  it('rejects invalid credentials', () => {
    const header = `Basic ${btoa('admin:wrong')}`;
    expect(isBasicAuthAuthorized(header, 'admin', 'secret')).toBe(false);
  });

  it('rejects malformed headers', () => {
    expect(isBasicAuthAuthorized('Bearer token', 'admin', 'secret')).toBe(false);
    expect(isBasicAuthAuthorized('Basic not-base64', 'admin', 'secret')).toBe(false);
    expect(isBasicAuthAuthorized(null, 'admin', 'secret')).toBe(false);
  });
});
