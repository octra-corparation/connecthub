import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../utils/apiError';

/** Place after express-validator chains to short-circuit on invalid input. */
export function validate(req: Request, _res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      ApiError.badRequest(
        'Validation failed',
        errors.array().map((e) => ({ field: 'path' in e ? e.path : undefined, message: e.msg }))
      )
    );
  }
  next();
}
