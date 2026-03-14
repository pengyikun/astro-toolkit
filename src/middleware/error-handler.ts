import type { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction): void => {
  const status = err.status || 500;
  const rawMessage = err.message || 'Internal Server Error';
  const safeMessage = status >= 500 ? 'Internal Server Error' : escapeHtml(rawMessage);

  if (status >= 500) console.error('[ERROR]', err);

  if (req.path.startsWith('/api/')) {
    res.status(status).json({ error: { message: safeMessage, status } });
    return;
  }
  res.status(status).render('error', {
    title: `Error ${status}`, status, message: safeMessage,
    nodeEnv: process.env.NODE_ENV || 'development',
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
};

export default errorHandler;
