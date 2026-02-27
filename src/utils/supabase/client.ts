import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null;

export const createClient = (): SupabaseClient => {
    if (_client) return _client;

    const newClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    if (typeof window !== 'undefined') {
        _client = newClient;
    }

    return newClient;
};
