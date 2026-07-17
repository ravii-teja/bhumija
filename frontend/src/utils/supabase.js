import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

let supabaseClient = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
}

if (!supabaseClient) {
  console.warn("Supabase environment variables are missing or invalid. Supabase features will be disabled.");
  supabaseClient = {
    from: () => ({
      insert: () => ({
        then: (cb) => {
          if (cb) cb({ data: null, error: new Error("Supabase is not configured") });
          return Promise.resolve({ error: new Error("Supabase is not configured") });
        }
      }),
      select: () => Promise.resolve({ data: [], error: new Error("Supabase is not configured") }),
    })
  };
}

export const supabase = supabaseClient;

