import { NextResponse, type NextRequest } from 'next/server';
import { createRequestClient } from '@/utils/supabase/server-request';

/**
 * Guards an API route.
 *
 * `src/proxy.ts` returns early for `/api/*` — it only attaches CORS headers and
 * never checks the session — so every route is responsible for its own auth.
 * Without this the AI routes are callable by anyone on the internet, which
 * burns the project's Gemini and Mistral quota.
 *
 * Uses createRequestClient so a Bearer token (Capacitor app) works as well as
 * cookies (web).
 *
 *   const auth = await requireUser(req);
 *   if (auth.error) return auth.error;
 *   // auth.user and auth.supabase are safe to use from here
 */
export async function requireUser(req: NextRequest) {
  const supabase = await createRequestClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      supabase,
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    } as const;
  }

  return { user, supabase, error: null } as const;
}
