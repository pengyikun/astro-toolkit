import type { Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import type { ValidatedRequest } from '../types';

function validate(schema: ZodType) {
  return (req: ValidatedRequest, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      req.body = result.data;
      next();
      return;
    }

    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    if (req.path.startsWith('/api/')) {
      res.status(422).json({
        error: {
          message: 'Validation failed',
          status: 422,
          details,
        },
      });
      return;
    }

    req.validationErrors = details;
    next();
  };
}

export default validate;
