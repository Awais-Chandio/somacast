// Values come from apps/mobile/.env via react-native-dotenv (see babel.config.js and .env.example).
declare module '@env' {
  export const SUPABASE_URL: string | undefined;
  export const SUPABASE_ANON_KEY: string | undefined;
}
