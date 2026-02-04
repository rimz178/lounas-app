import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client (browser + server)
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables");
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-only client (Service Role)
const isServer = typeof window === "undefined";
const serverClient = isServer
  ? (() => {
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase server environment variables");
      }
      return createClient(supabaseUrl, supabaseServiceKey);
    })()
  : null;

export const supabaseServer = serverClient;
