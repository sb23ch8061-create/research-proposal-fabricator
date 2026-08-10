import { createClient } from "@supabase/supabase-js";

// We securely pull the keys from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// We create and export the bridge to the database
export const supabase = createClient(supabaseUrl, supabaseKey);