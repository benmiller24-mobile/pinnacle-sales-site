// Server-side gate for the Dealer Hub. Runs on Netlify's edge before any /dealer-hub/ file
// is served: without a valid signed session cookie, every hub page except the login page
// (/dealer-hub/) redirects to the login page. The old sessionStorage check in the pages
// stays as a UI convenience only; this is the actual protection.
//
// Env (Netlify → Site configuration → Environment variables, scope must include Edge Functions):
//   DEALER_HUB_SECRET        required, 32+ random characters (scripts/hub-passcodes.mjs secret)
//   DEALER_HUB_REVOKED       optional, comma-separated usernames
//   DEALER_HUB_GENERATIONS   optional, "username=2, other=3" to re-issue individual passcodes
//
// If DEALER_HUB_SECRET is missing the gate fails closed (everyone is sent to the login page).

import { COOKIE_NAME, getCookie, isPublicHubPath, readSession } from '../shared/hub-auth.mjs';

export default async (request, context) => {
  const url = new URL(request.url);
  if (isPublicHubPath(url.pathname)) return context.next();

  const env = (name) => (globalThis.Netlify?.env?.get(name)) ?? undefined;
  const session = await readSession(env('DEALER_HUB_SECRET'), getCookie(request.headers.get('cookie'), COOKIE_NAME), {
    revoked: env('DEALER_HUB_REVOKED'),
    generations: env('DEALER_HUB_GENERATIONS'),
  });

  if (!session) {
    const login = new URL('/dealer-hub/', url);
    login.searchParams.set('redirect', url.pathname);
    return new Response(null, {
      status: 302,
      headers: { Location: login.pathname + login.search, 'Cache-Control': 'private, no-store' },
    });
  }

  const response = await context.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
};

export const config = {
  path: ['/dealer-hub', '/dealer-hub/*'],
};
