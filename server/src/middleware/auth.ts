import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { prisma } from '../config/prisma';

export interface AuthedRequest extends Request {
  user?: { id: string; role: 'USER' | 'ADMIN' | 'MODERATOR' };
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.accessToken) return req.cookies.accessToken;
  return null;
}

/** Requires a valid access token. Attaches req.user or throws 401. */
export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('Authentication required'));

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/** Attaches req.user if a valid token is present, but doesn't fail otherwise. */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.userId, role: payload.role };
  } catch {
    // ignore invalid token in optional context
  }
  next();
}

/** Restricts access to specific roles. Must run after requireAuth. */
export function requireRole(...roles: Array<'USER' | 'ADMIN' | 'MODERATOR'>) {
  return (req: AuthedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient permissions'));
    next();
  };
}

/** Ensures the account behind the token is still active (not suspended/banned). */
export async function requireActiveUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  if (!req.user) return next(ApiError.unauthorized());
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { isActive: true } });
  if (!user || !user.isActive) return next(ApiError.forbidden('This account has been suspended'));
  next();
}
