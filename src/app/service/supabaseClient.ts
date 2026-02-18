import { createClient } from '@supabase/supabase-js';

// Supabase URL ja julkinen avain ympäristömuuttujista
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Luo Supabase-asiakas
export const supabase = createClient(supabaseUrl, supabaseAnonKey);