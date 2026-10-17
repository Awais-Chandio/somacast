import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// The same Supabase project as the phone. Only the public URL and anon key live in the browser;
// RLS decides what a signed-in user may read or write.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, { auth: { persistSession: true } })
    : null;
