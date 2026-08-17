// Builder/contractor accounts — real accounts backed by Supabase Auth,
// shared across every device (see src/lib/profile.ts for the underlying
// account layer, and supabase/schema.sql for the schema + RLS).

import {
  signUpWithProfile,
  logInWithProfile,
  logOut as logOutProfile,
  getCurrentProfile,
  listProfilesByRole,
  type Profile,
} from "./profile";

export interface BuilderAccount {
  id: string;
  businessName: string;
  email: string;
  state: string;
  createdAt: string;
  isAdmin: boolean;
}

function toBuilderAccount(profile: Profile): BuilderAccount {
  return {
    id: profile.id,
    businessName: profile.name,
    email: profile.email,
    state: profile.state ?? "",
    createdAt: profile.createdAt,
    isAdmin: profile.isAdmin,
  };
}

export async function signUp(
  businessName: string,
  email: string,
  password: string,
  state: string,
): Promise<{ account: BuilderAccount } | { pendingConfirmation: true } | { error: string }> {
  const result = await signUpWithProfile({
    email,
    password,
    role: "builder",
    name: businessName,
    state,
  });
  if ("error" in result || "pendingConfirmation" in result) return result;
  window.dispatchEvent(new Event("homey-auth-change"));
  return { account: toBuilderAccount(result.profile) };
}

export async function logIn(
  email: string,
  password: string,
): Promise<{ account: BuilderAccount } | { error: string }> {
  const result = await logInWithProfile(email, password, "builder");
  if ("error" in result) return result;
  window.dispatchEvent(new Event("homey-auth-change"));
  return { account: toBuilderAccount(result.profile) };
}

export async function logOut(): Promise<void> {
  await logOutProfile();
  window.dispatchEvent(new Event("homey-auth-change"));
}

export async function getSession(): Promise<BuilderAccount | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "builder") return null;
  return toBuilderAccount(profile);
}

// Real member builders, visible to any signed-in user — powers the
// buyer-facing directory (src/lib/builderDirectory.ts).
export async function getAllAccounts(): Promise<BuilderAccount[]> {
  const profiles = await listProfilesByRole("builder");
  return profiles.map(toBuilderAccount);
}
