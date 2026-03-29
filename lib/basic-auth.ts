export interface BasicAuthConfig {
  mode: 'disabled' | 'enabled' | 'misconfigured';
  username?: string;
  password?: string;
}

function decodeBase64(value: string): string | null {
  try {
    return atob(value);
  } catch {
    return null;
  }
}

function splitCredentials(decoded: string): { username: string; password: string } | null {
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) {
    return null;
  }

  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

export function resolveBasicAuthConfig(
  env: Record<string, string | undefined>,
): BasicAuthConfig {
  const authDisabled = env.APP_AUTH_DISABLED === 'true';
  const username = env.BASIC_AUTH_USERNAME?.trim();
  const password = env.BASIC_AUTH_PASSWORD;
  const isProduction = env.NODE_ENV === 'production';

  if (authDisabled) {
    return { mode: 'disabled' };
  }

  if (username && password) {
    return { mode: 'enabled', username, password };
  }

  if (isProduction) {
    return { mode: 'misconfigured' };
  }

  return { mode: 'disabled' };
}

export function isBasicAuthAuthorized(
  authorizationHeader: string | null,
  username: string,
  password: string,
): boolean {
  if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
    return false;
  }

  const encoded = authorizationHeader.slice('Basic '.length).trim();
  if (!encoded) {
    return false;
  }

  const decoded = decodeBase64(encoded);
  if (!decoded) {
    return false;
  }

  const credentials = splitCredentials(decoded);
  if (!credentials) {
    return false;
  }

  return (
    constantTimeEqual(credentials.username, username) &&
    constantTimeEqual(credentials.password, password)
  );
}
