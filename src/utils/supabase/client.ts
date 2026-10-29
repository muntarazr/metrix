import { createBrowserClient } from '@supabase/ssr'

// Safe dummy placeholders for build-time evaluation when environment variables are not supplied.
// Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.
const DUMMY_SUPABASE_URL = "https://placeholder-project.supabase.co";
const DUMMY_SUPABASE_ANON_KEY = "placeholder-anon-key";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || DUMMY_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DUMMY_SUPABASE_ANON_KEY
    )
}
