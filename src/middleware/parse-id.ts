import type { Request, Response, NextFunction } from 'express';

export function parseId(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.params.id;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new Error('Invalid ID format');
    (err as any).status = 400;
    return next(err);
  }
  next();
}
