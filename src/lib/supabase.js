import { createClient } from '@supabase/supabase-js';

// VITE_* vars are embedded at build time.
// Fallbacks are used when the build pipeline doesn't inject them
// (e.g. Cloudflare auto-builds). The anon key is a public key by
// design — security is enforced server-side via RLS policies.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://rveegrdgnvrhzdrgjeno.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2ZWVncmRnbnZyaHpkcmdqZW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4NDY0MjYsImV4cCI6MjA5NTQyMjQyNn0.JAZ2cVB9sDrGUyKc10Y8XaJ1_QYbRl709dNyffz0PLc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
