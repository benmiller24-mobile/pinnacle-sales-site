import type { Config, Context } from "@netlify/edge-functions";

// Server-side gate for the Dealer Hub.
//
// Every /dealer-hub/* page (except the login page itself) requires a valid
// `ph_session` cookie issued by netlify/functions/dealer-hub-login.mts.
// The cookie is   base64url(JSON {u, n, x}) + "." + base64url(HMAC-SHA256)
// signed with DEALER_HUB_SESSION_SECRET. Anything else is redirected to the
// login page before the HTML is served — unlike the old sessionStorage check,
// which ran in the browser after the page (and its source) had already loaded.

const COOKIE = "ph_session";

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function verifySession(token: string, secret: string): Promise<{ u: string; n: string; x: number } | null> {
  const dot = token.indexOf(".");
  if (dot <= 0 || token.length > 4096) return null;
  const payloadPart = token.slice(0, dot);
  let sig: Uint8Array;
  try {
    sig = b64urlToBytes(token.slice(dot + 1));
  } catch {
    return null;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  // crypto.subtle.verify is constant-time.
  const ok = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(payloadPart));
  if (!ok) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(payloadPart)));
    if (typeof payload?.u !== "string" || typeof payload?.x !== "number") return null;
    if (payload.x < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const secret = Netlify.env.get("DEALER_HUB_SESSION_SECRET");

  const toLogin = () => {
    const login = new URL("/dealer-hub/", url);
    login.searchParams.set("redirect", url.pathname + url.search);
    return new Response(null, {
      status: 302,
      headers: { Location: login.toString(), "Cache-Control": "no-store" },
    });
  };

  // Fail closed: without a configured secret nobody gets in.
  if (!secret || secret.length < 32) return toLogin();

  const token = context.cookies.get(COOKIE);
  if (!token || !(await verifySession(token, secret))) return toLogin();

  const response = await context.next();
  // Gated pages must never be cached by shared caches or indexed.
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
};

export const config: Config = {
  path: "/dealer-hub/*",
  excludedPath: ["/dealer-hub", "/dealer-hub/", "/dealer-hub/index.html"],
};
