import type { Config } from '@netlify/functions';
import { SESSION_COOKIE } from '../lib/dealer-hub-auth.mjs';

// POST /api/dealer-hub/logout → clears the HttpOnly session cookie.
export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  return new Response(null, {
    status: 204,
    headers: {
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
      'Cache-Control': 'no-store',
    },
  });
};

export const config: Config = { path: '/api/dealer-hub/logout' };
