import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';

const client = new OAuth2Client(env.google.clientId);

/**
 * Verifies a Google ID token sent from the frontend (Google Identity Services
 * "One Tap" / button flow) and returns the verified profile fields.
 */
export async function verifyGoogleIdToken(idToken: string) {
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: env.google.clientId });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new Error('Incomplete Google profile');
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch {
    throw ApiError.unauthorized('Invalid Google token');
  }
}
