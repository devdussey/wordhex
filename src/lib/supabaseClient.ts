import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true },
  });
} else {
  console.warn(
    "Supabase environment variables are missing. The app will fall back to a local demo session.",
  );
}

export const supabase = client;
export const isSupabaseConfigured = Boolean(client);
export type SupabaseSession = Session;
