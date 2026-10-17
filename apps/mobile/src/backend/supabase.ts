import 'react-native-url-polyfill/auto'; // supabase-js needs a full URL implementation
import { AppState } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@env';

// The ground database. Only the public URL and anon key live on the phone; RLS decides what each
// signed-in user may read or write. Without them (no .env) the app runs offline on the demo ground.

let client: SupabaseClient | null | undefined;

export function isBackendConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// One client per app process, created on first use. null when .env is missing.
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return (client = null);

  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: createAsyncStorage('somacast-auth'), // the session survives an app restart
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // no browser redirects in a native app
    },
  });

  // Refresh the session token only while the app is on screen (Supabase's React Native guidance).
  const c = client;
  AppState.addEventListener('change', state => {
    if (state === 'active') c.auth.startAutoRefresh();
    else c.auth.stopAutoRefresh();
  });
  return client;
}
