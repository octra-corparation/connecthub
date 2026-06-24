import { NextFunction, Request, RequestHandler, Response } from 'express';

/** Wraps async route handlers so thrown/rejected errors reach Express's error middleware. */
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
