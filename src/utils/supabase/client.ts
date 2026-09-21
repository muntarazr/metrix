import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = "https://jxrfniuqoazeegiehfob.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_kRy7MtrtUTnjf6M7G18iwA_JjmpTpmo";

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
    )
}

