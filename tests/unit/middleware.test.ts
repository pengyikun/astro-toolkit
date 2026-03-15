process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import errorHandler from '../../src/middleware/error-handler';
import { parseId } from '../../src/middleware/parse-id';
import validate from '../../src/middleware/validate';

vi.mock('../../src/config', async (importOriginal) => {
  const original: any = await importOriginal();
  return { default: { ...original.default, nodeEnv: 'test' } };
});

import { csrfToken, csrfProtection } from '../../src/middleware/csrf';
import config from '../../src/config';
import upload from '../../src/middleware/upload';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockReq(overrides = {}): any {
  return { path: '/', ...overrides };
}

function mockRes(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.render = vi.fn().mockReturnValue(res);
  return res;
}

// ── errorHandler ─────────────────────────────────────────────────────────────

describe('errorHandler', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('returns JSON for API routes with 400 error', () => {
    const err: any = new Error('Bad <input>');
    err.status = 400;
    const req = mockReq({ path: '/api/accounts' });
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Bad &lt;input&gt;', status: 400 },
    });
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('returns JSON with generic message for API routes with 500 error', () => {
    const err: any = new Error('secret DB details');
    err.status = 500;
    const req = mockReq({ path: '/api/data' });
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal Server Error', status: 500 },
    });
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('renders error page for HTML routes with 404 error', () => {
    const err: any = new Error('Not Found');
    err.status = 404;
    const req = mockReq({ path: '/accounts/999' });
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith('error', expect.objectContaining({
      status: 404,
      message: 'Not Found',
    }));
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('renders error page with generic message for HTML 500 errors', () => {
    const err: any = new Error('sensitive info');
    err.status = 500;
    const req = mockReq({ path: '/accounts' });
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.render).toHaveBeenCalledWith('error', expect.objectContaining({
      status: 500,
      message: 'Internal Server Error',
    }));
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('defaults to status 500 when no status set on error', () => {
    const err = new Error('oops');
    const req = mockReq({ path: '/api/test' });
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Internal Server Error', status: 500 },
    });
  });

  it('escapes HTML in 4xx error messages for API routes', () => {
    const err: any = new Error('<script>alert("xss")</script>');
    err.status = 422;
    const req = mockReq({ path: '/api/accounts' });
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    const payload = res.json.mock.calls[0][0];
    expect(payload.error.message).not.toContain('<script>');
    expect(payload.error.message).toContain('&lt;script&gt;');
  });
});

// ── parseId ──────────────────────────────────────────────────────────────────

describe('parseId', () => {
  it('calls next() without error for valid integer id', () => {
    const req = mockReq({ params: { id: '5' } });
    const res = mockRes();
    const next = vi.fn();

    parseId(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(error) with status 400 for non-numeric id', () => {
    const req = mockReq({ params: { id: 'abc' } });
    const res = mockRes();
    const next = vi.fn();

    parseId(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('calls next(error) with status 400 for id = 0', () => {
    const req = mockReq({ params: { id: '0' } });
    const res = mockRes();
    const next = vi.fn();

    parseId(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('calls next(error) with status 400 for negative id', () => {
    const req = mockReq({ params: { id: '-1' } });
    const res = mockRes();
    const next = vi.fn();

    parseId(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('calls next(error) with status 400 for decimal id', () => {
    const req = mockReq({ params: { id: '1.5' } });
    const res = mockRes();
    const next = vi.fn();

    parseId(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });
});

// ── validate ─────────────────────────────────────────────────────────────────

describe('validate', () => {
  const testSchema = z.object({ name: z.string().min(1) });

  it('sets req.body to parsed data and calls next on valid input', () => {
    const middleware = validate(testSchema);
    const req = mockReq({ body: { name: 'Alice', extra: 'ignored' } });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.body).toEqual({ name: 'Alice' });
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 422 JSON for invalid body on API route', () => {
    const middleware = validate(testSchema);
    const req = mockReq({ path: '/api/accounts', body: { name: '' } });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: 'Validation failed',
        status: 422,
        details: expect.any(Array),
      }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('sets validationErrors and calls next for invalid body on HTML route', () => {
    const middleware = validate(testSchema);
    const req = mockReq({ path: '/accounts', body: {} });
    const res = mockRes();
    const next = vi.fn();

    middleware(req, res, next);

    expect(req.validationErrors).toBeDefined();
    expect(req.validationErrors.length).toBeGreaterThan(0);
    expect(next).toHaveBeenCalled();
  });
});

// ── csrfToken ────────────────────────────────────────────────────────────────

describe('csrfToken', () => {
  it('creates a session token if none exists', () => {
    const req = mockReq({ session: {}, is: () => false, body: {} });
    const res = mockRes();
    const next = vi.fn();

    csrfToken(req, res, next);

    expect(req.session.csrfToken).toBeDefined();
    expect(typeof req.session.csrfToken).toBe('string');
    expect(req.session.csrfToken.length).toBe(64); // 32 bytes hex
    expect(req.csrfToken()).toBe(req.session.csrfToken);
    expect(next).toHaveBeenCalled();
  });

  it('reuses existing session token', () => {
    const existingToken = 'existing-token-value';
    const req = mockReq({ session: { csrfToken: existingToken }, is: () => false, body: {} });
    const res = mockRes();
    const next = vi.fn();

    csrfToken(req, res, next);

    expect(req.session.csrfToken).toBe(existingToken);
    expect(req.csrfToken()).toBe(existingToken);
    expect(next).toHaveBeenCalled();
  });
});

// ── csrfProtection ───────────────────────────────────────────────────────────

describe('csrfProtection', () => {
  it('GET request passes through (safe method)', () => {
    const req = mockReq({ method: 'GET', session: {}, is: () => false, path: '/', body: {} });
    const res = mockRes();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('HEAD request passes through (safe method)', () => {
    const req = mockReq({ method: 'HEAD', session: {}, is: () => false, path: '/', body: {} });
    const res = mockRes();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('OPTIONS request passes through (safe method)', () => {
    const req = mockReq({ method: 'OPTIONS', session: {}, is: () => false, path: '/', body: {} });
    const res = mockRes();
    const next = vi.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('POST in test env skips CSRF check', () => {
    const req = mockReq({ method: 'POST', session: {}, is: () => false, path: '/accounts', body: {} });
    const res = mockRes();
    const next = vi.fn();

    csrfProtection(req, res, next);

    // In test env (NODE_ENV=test), CSRF is skipped
    expect(next).toHaveBeenCalledWith();
  });

  it('multipart/form-data passes through in non-test env', () => {
    (config as any).nodeEnv = 'development';
    try {
      const req = mockReq({
        method: 'POST',
        session: {},
        is: (type: string) => type === 'multipart/form-data',
        path: '/vault',
        body: {},
      });
      const res = mockRes();
      const next = vi.fn();

      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    } finally {
      (config as any).nodeEnv = 'test';
    }
  });

  it('API JSON requests pass through in non-test env', () => {
    (config as any).nodeEnv = 'development';
    try {
      const req = mockReq({
        method: 'POST',
        session: {},
        is: (type: string) => type === 'application/json',
        path: '/api/iban/validate',
        body: {},
      });
      const res = mockRes();
      const next = vi.fn();

      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    } finally {
      (config as any).nodeEnv = 'test';
    }
  });

  it('POST with invalid CSRF token returns 403 in non-test env', () => {
    (config as any).nodeEnv = 'development';
    try {
      const req = mockReq({
        method: 'POST',
        session: { csrfToken: 'real-token' },
        is: () => false,
        path: '/accounts',
        body: { _csrf: 'wrong-token' },
        headers: {},
      });
      const res = mockRes();
      const next = vi.fn();

      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    } finally {
      (config as any).nodeEnv = 'test';
    }
  });

  it('POST with missing CSRF token returns 403 in non-test env', () => {
    (config as any).nodeEnv = 'development';
    try {
      const req = mockReq({
        method: 'POST',
        session: {},
        is: () => false,
        path: '/accounts',
        body: {},
        headers: {},
      });
      const res = mockRes();
      const next = vi.fn();

      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 403 }));
    } finally {
      (config as any).nodeEnv = 'test';
    }
  });

  it('POST with valid CSRF token passes and rotates token in non-test env', () => {
    (config as any).nodeEnv = 'development';
    try {
      const token = 'valid-session-token';
      const req = mockReq({
        method: 'POST',
        session: { csrfToken: token },
        is: () => false,
        path: '/accounts',
        body: { _csrf: token },
      });
      const res = mockRes();
      res.locals = {};
      const next = vi.fn();

      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
      // Token should be rotated
      expect(req.session.csrfToken).not.toBe(token);
      expect(res.locals.csrfToken).toBe(req.session.csrfToken);
    } finally {
      (config as any).nodeEnv = 'test';
    }
  });

  it('POST with x-csrf-token header passes in non-test env', () => {
    (config as any).nodeEnv = 'development';
    try {
      const token = 'header-csrf-token';
      const req = mockReq({
        method: 'POST',
        session: { csrfToken: token },
        is: () => false,
        path: '/accounts',
        body: {},
        headers: { 'x-csrf-token': token },
      });
      const res = mockRes();
      res.locals = {};
      const next = vi.fn();

      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledWith();
    } finally {
      (config as any).nodeEnv = 'test';
    }
  });
});

// ── upload (Multer) ──────────────────────────────────────────────────────────

describe('upload middleware', () => {
  it('is a multer instance with single method', () => {
    expect(upload).toBeDefined();
    expect(typeof upload.single).toBe('function');
    expect(typeof upload.array).toBe('function');
    expect(typeof upload.fields).toBe('function');
  });

  it('upload.single returns a middleware function', () => {
    const middleware = upload.single('cert_file');
    expect(typeof middleware).toBe('function');
  });

  it('accepts allowed certificate extensions via integration test', async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    // Ensure upload dir exists
    const uploadDir = config.certUploadDir;
    fs.mkdirSync(uploadDir, { recursive: true });

    const app = express();
    app.post('/test-upload', upload.single('cert_file'), (req: any, res: any) => {
      if (req.file) {
        // Clean up uploaded file
        fs.unlinkSync(req.file.path);
        res.json({ filename: req.file.filename, originalname: req.file.originalname });
      } else {
        res.status(400).json({ error: 'No file' });
      }
    });
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(400).json({ error: err.message });
    });

    // Create a temp .pem file
    const tmpFile = path.join(uploadDir, 'test-upload.pem');
    fs.writeFileSync(tmpFile, 'test-cert-content');

    try {
      const res = await supertest(app)
        .post('/test-upload')
        .attach('cert_file', tmpFile);

      expect(res.status).toBe(200);
      expect(res.body.originalname).toBe('test-upload.pem');
      expect(res.body.filename).toMatch(/\.pem$/);
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });

  it('rejects disallowed file extensions', async () => {
    const express = (await import('express')).default;
    const supertest = (await import('supertest')).default;
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;

    const uploadDir = config.certUploadDir;
    fs.mkdirSync(uploadDir, { recursive: true });

    const app = express();
    app.post('/test-upload', upload.single('cert_file'), (req: any, res: any) => {
      res.json({ uploaded: !!req.file });
    });
    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(400).json({ error: err.message });
    });

    const tmpFile = path.join(uploadDir, 'test-upload.exe');
    fs.writeFileSync(tmpFile, 'malicious-content');

    try {
      const res = await supertest(app)
        .post('/test-upload')
        .attach('cert_file', tmpFile);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('File type not allowed');
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});
