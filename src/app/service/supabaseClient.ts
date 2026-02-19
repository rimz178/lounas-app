import { createClient } from "@supabase/supabase-js";

// Supabase URL ja julkinen avain ympäristömuuttujista
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Luo Supabase-asiakas
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function for signing in
export async function signInWithEmail(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

// Helper function for signing up
export async function signUpWithEmail(email: string, password: string) {
  return await supabase.auth.signUp({ email, password });
}
