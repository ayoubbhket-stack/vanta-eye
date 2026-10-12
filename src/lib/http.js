import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { HttpError } from './auth';

export const ok = (data, init) => NextResponse.json(data, init);
export const fail = (status, error, extra) => NextResponse.json({ error, ...extra }, { status });

/** Wrap a route handler: maps auth errors, validation errors and unexpected errors to JSON. */
export function handler(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      // let Next.js control-flow errors (dynamic usage, redirects, notFound) pass through
      if (typeof e?.digest === 'string' && (e.digest.startsWith('NEXT_') || e.digest === 'DYNAMIC_SERVER_USAGE')) throw e;
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof ZodError) {
        const fields = {};
        for (const i of e.issues) fields[i.path.join('.')] = i.message;
        return fail(422, 'Please check the highlighted fields.', { fields });
      }
      if (e?.code === '23505') return fail(409, 'That value is already in use (must be unique).', { detail: e.detail });
      if (e?.code === '23514') return fail(422, 'A value is outside the allowed range.', { detail: e.constraint });
      console.error(e);
      return fail(500, 'Something went wrong on the server. Please try again.');
    }
  };
}

/** Same-origin check for public write endpoints (checkout, reviews, contact). */
export function assertSameOrigin(req) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (origin && host && new URL(origin).host !== host) throw new HttpError(403, 'Cross-site request blocked.');
}

// naive in-memory rate limiter (per server instance)
const buckets = new Map();
export function rateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n += 1; buckets.set(key, b);
  if (b.n > limit) throw new HttpError(429, 'Too many requests. Please wait a minute and try again.');
}

export const clientIp = (req) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';

export function csvResponse(filename, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s; // CSV-injection guard
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const body = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\n');
  return new NextResponse(body, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${filename}"` } });
}
