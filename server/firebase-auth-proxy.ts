import type { Request, RequestHandler } from 'express';

const FIREBASE_AUTH_UPSTREAM = 'https://gamefolio-e8bde.firebaseapp.com';
const FORWARDED_RESPONSE_HEADERS = [
  'cache-control', 'content-language', 'content-type', 'etag', 'expires', 'last-modified',
] as const;

async function readRequestBody(req: Request): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

/** Keep Firebase redirect state first-party in partitioning browsers/webviews. */
export const firebaseAuthProxy: RequestHandler = async (req, res) => {
  try {
    const upstreamUrl = new URL(req.originalUrl, FIREBASE_AUTH_UPSTREAM);
    const body = await readRequestBody(req);
    const headers = new Headers();
    for (const name of ['accept', 'accept-language', 'content-type', 'user-agent'] as const) {
      const value = req.headers[name];
      if (typeof value === 'string') headers.set(name, value);
    }
    const upstream = await fetch(upstreamUrl, { method: req.method, headers, body, redirect: 'manual' });
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    const location = upstream.headers.get('location');
    if (location) res.setHeader('location', location.replace(FIREBASE_AUTH_UPSTREAM, `${req.protocol}://${req.get('host')}`));
    const getSetCookie = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
    const cookies = getSetCookie?.call(upstream.headers);
    if (cookies?.length) res.setHeader('set-cookie', cookies);
    res.status(upstream.status);
    if (req.method === 'HEAD' || upstream.status === 204 || upstream.status === 304) return res.end();
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('Firebase auth helper proxy failed:', error);
    return res.status(502).type('text/plain').send('Firebase authentication helper unavailable');
  }
};
