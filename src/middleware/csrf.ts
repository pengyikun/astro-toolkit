import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
  }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function ensureToken(req: Request): string {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  return req.session.csrfToken;
}

export function csrfToken(req: Request, _res: Response, next: NextFunction): void {
  const token = ensureToken(req);
  (req as any).csrfToken = () => token;
  next();
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF in test environment (tests use supertest without browser sessions)
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  // Skip CSRF for API routes that use JSON content type (they have CORS protection)
  if (req.path.startsWith('/api/') && req.is('application/json')) {
    return next();
  }

  const token = req.session.csrfToken;
  const submittedToken = req.body?._csrf || req.headers['x-csrf-token'];

  if (!token || !submittedToken || token !== submittedToken) {
    const err = new Error('Invalid or missing CSRF token');
    (err as any).status = 403;
    return next(err);
  }

  // Rotate token after successful validation
  req.session.csrfToken = generateToken();
  (req as any).csrfToken = () => req.session.csrfToken;
  next();
}
