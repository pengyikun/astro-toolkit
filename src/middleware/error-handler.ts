import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
}

const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction): void => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (status >= 500) console.error('[ERROR]', err);
  if (req.path.startsWith('/api/')) {
    res.status(status).json({ error: { message, status } });
    return;
  }
  res.status(status).render('error', {
    title: `Error ${status}`, status, message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
};

export default errorHandler;
