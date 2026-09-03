// The free Homey account — covers both Lot Check and Renovation Check.
// Real accounts backed by Supabase Auth (see src/lib/profile.ts), shared
// across every device. No billing, no trial, no cost — an account just
// gets you saved history and the builder marketplace (connecting, posting
// jobs, bids), both of which need somewhere to save to.

import {
  signUpWithProfile,
  logInWithProfile,
  logOut as logOutProfile,
  getCurrentProfile,
  type Profile,
} from "./profile";

export interface ConsumerAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isAdmin: boolean;
}

function toConsumerAccount(profile: Profile): ConsumerAccount {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    createdAt: profile.createdAt,
    isAdmin: profile.isAdmin,
  };
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<{ account: ConsumerAccount } | { pendingConfirmation: true } | { error: string }> {
  const result = await signUpWithProfile({ email, password, role: "consumer", name });
  if ("error" in result || "pendingConfirmation" in result) return result;
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return { account: toConsumerAccount(result.profile) };
}

export async function logIn(
  email: string,
  password: string,
): Promise<{ account: ConsumerAccount } | { error: string }> {
  const result = await logInWithProfile(email, password, "consumer");
  if ("error" in result) return result;
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return { account: toConsumerAccount(result.profile) };
}

export async function logOut(): Promise<void> {
  await logOutProfile();
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
}

export async function getSession(): Promise<ConsumerAccount | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "consumer") return null;
  return toConsumerAccount(profile);
}
