import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';

const CSRF_COOKIE = 'csrfToken';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit-cookie CSRF protection.
 *
 * Note: this app primarily authenticates via Bearer access tokens stored in
 * memory on the client (with httpOnly cookies as a fallback/refresh
 * mechanism). Requests authenticated purely with an Authorization header are
 * NOT vulnerable to CSRF (a malicious site can't read or set that header),
 * so we only enforce the check when the request is relying on cookies.
 */
export function issueCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by client JS to echo back in the header
      secure: env.isProd,
      sameSite: env.isProd ? 'strict' : 'lax',
      path: '/',
    });
  }
  next();
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  // If the request carries its own Authorization Bearer token, it's immune to CSRF.
  if (req.headers.authorization?.startsWith('Bearer ')) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }
  next();
}
