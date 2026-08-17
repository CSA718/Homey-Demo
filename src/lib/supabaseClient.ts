// Real backend: Supabase (Postgres + Auth). The anon key is meant to be
// public — Supabase's security model is enforced by database Row Level
// Security policies (see supabase/schema.sql), not by hiding this key. A
// baked-in default lets the GitHub Pages build work with no CI secrets;
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY can override it for a
// different project (e.g. local development against your own instance).

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://cqifegfujhbudojspvkh.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxaWZlZ2Z1amhidWRvanNwdmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5NzMyNDksImV4cCI6MjEwMjU0OTI0OX0.rxcqdlKNCmfgMzN0DgjZQ1Wa6FQKAZj_2Fb0TA-hPAU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
