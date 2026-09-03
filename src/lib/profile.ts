// Shared Supabase-Auth-backed account layer used by both builder accounts
// (auth.ts) and consumer accounts (consumerAuth.ts). Real accounts, real
// passwords (handled entirely by Supabase Auth), real cross-device data —
// a profiles row is created server-side the instant someone signs up (see
// the on_auth_user_created trigger in supabase/schema.sql), so it works
// whether or not email confirmation is turned on.

import { supabase } from "./supabaseClient";

export type AccountRole = "consumer" | "builder";

export interface Profile {
  id: string;
  role: AccountRole;
  isAdmin: boolean;
  name: string;
  email: string;
  state: string | null;
  trialEndsAt: string | null;
  canceledAt: string | null;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  role: AccountRole;
  is_admin: boolean;
  name: string;
  email: string;
  state: string | null;
  trial_ends_at: string | null;
  canceled_at: string | null;
  created_at: string;
}

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    role: row.role,
    isAdmin: row.is_admin,
    name: row.name,
    email: row.email,
    state: row.state,
    trialEndsAt: row.trial_ends_at,
    canceledAt: row.canceled_at,
    createdAt: row.created_at,
  };
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as ProfileRow);
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return fetchProfile(user.id);
}

export async function signUpWithProfile(input: {
  email: string;
  password: string;
  role: AccountRole;
  name: string;
  state?: string | null;
  trialEndsAt?: string | null;
}): Promise<{ profile: Profile } | { pendingConfirmation: true } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: {
      data: {
        role: input.role,
        name: input.name.trim(),
        state: input.state ?? null,
        trial_ends_at: input.trialEndsAt ?? null,
      },
    },
  });
  if (error) {
    if (/already registered/i.test(error.message)) {
      return { error: "An account with that email already exists. Try logging in instead." };
    }
    return { error: error.message };
  }
  if (!data.session || !data.user) {
    return { pendingConfirmation: true };
  }
  const profile = await fetchProfile(data.user.id);
  if (!profile) return { error: "Account created, but the profile couldn't be loaded. Try logging in." };
  return { profile };
}

export async function logInWithProfile(
  email: string,
  password: string,
  expectedRole: AccountRole,
): Promise<{ profile: Profile } | { error: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) {
    return { error: "No account matches that email and password." };
  }
  const profile = await fetchProfile(data.user.id);
  if (!profile) {
    return { error: "Account found, but no profile exists for it. Contact support." };
  }
  if (profile.role !== expectedRole) {
    await supabase.auth.signOut();
    const kind = expectedRole === "builder" ? "builder" : "ClearParcel";
    return { error: `That email is registered as a ${profile.role} account, not a ${kind} account.` };
  }
  return { profile };
}

export async function logOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Public builder directory (any signed-in user can read role='builder'
// rows — see the profiles_select policy in supabase/schema.sql).
export async function listProfilesByRole(role: AccountRole): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").eq("role", role);
  if (error || !data) return [];
  return (data as ProfileRow[]).map(fromRow);
}

// Admin-only: every account, of every role. RLS only returns rows at all
// if the caller's own profile has is_admin = true.
export async function listAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as ProfileRow[]).map(fromRow);
}
