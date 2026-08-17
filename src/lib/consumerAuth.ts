// The consumer Homey Membership — a single $25/mo, 7-day-free-trial
// account that covers both Lot Check and Renovation Check. Real accounts
// backed by Supabase Auth (see src/lib/profile.ts), shared across every
// device. Trial/billing state is tracked as real data — there is no real
// payment processor wired in.

import { supabase } from "./supabaseClient";
import {
  signUpWithProfile,
  logInWithProfile,
  logOut as logOutProfile,
  getCurrentProfile,
  fetchProfile,
  type Profile,
} from "./profile";

const TRIAL_DAYS = 7;

export interface ConsumerAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  trialEndsAt: string;
  canceledAt: string | null;
  isAdmin: boolean;
}

export type SubscriptionState = "trialing" | "active" | "canceled";

function toConsumerAccount(profile: Profile): ConsumerAccount {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    createdAt: profile.createdAt,
    trialEndsAt: profile.trialEndsAt ?? profile.createdAt,
    canceledAt: profile.canceledAt,
    isAdmin: profile.isAdmin,
  };
}

export function getSubscriptionState(account: ConsumerAccount): SubscriptionState {
  if (account.canceledAt) return "canceled";
  return new Date(account.trialEndsAt).getTime() > Date.now() ? "trialing" : "active";
}

export function trialDaysLeft(account: ConsumerAccount): number {
  const ms = new Date(account.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<{ account: ConsumerAccount } | { pendingConfirmation: true } | { error: string }> {
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const result = await signUpWithProfile({
    email,
    password,
    role: "consumer",
    name,
    trialEndsAt,
  });
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

export async function cancelMembership(accountId: string): Promise<ConsumerAccount | null> {
  const canceledAt = new Date().toISOString();
  const { error } = await supabase.from("profiles").update({ canceled_at: canceledAt }).eq("id", accountId);
  if (error) return null;
  const profile = await fetchProfile(accountId);
  if (!profile) return null;
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return toConsumerAccount(profile);
}

export async function resumeMembership(accountId: string): Promise<ConsumerAccount | null> {
  const { error } = await supabase.from("profiles").update({ canceled_at: null }).eq("id", accountId);
  if (error) return null;
  const profile = await fetchProfile(accountId);
  if (!profile) return null;
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return toConsumerAccount(profile);
}
