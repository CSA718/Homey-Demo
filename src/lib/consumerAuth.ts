// Local "demo accounts" for the consumer Homey Membership — a single
// $25/mo, 7-day-free-trial account that covers both Lot Check and
// Renovation Check, kept separate from builder accounts (src/lib/auth.ts)
// since those are a different kind of member with a different
// relationship to the product. No backend, no database, no real billing:
// everything lives in localStorage, and the password hash below is a
// simple non-cryptographic checksum, adequate only because this data
// never leaves the browser.

import { storage } from "./storage";

const TRIAL_DAYS = 7;

export interface ConsumerAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  trialEndsAt: string;
  canceledAt: string | null;
}

interface StoredConsumerAccount extends ConsumerAccount {
  passwordHash: string;
}

export type SubscriptionState = "trialing" | "active" | "canceled";

const ACCOUNTS_KEY = "homey_consumer_accounts_v1";
const SESSION_KEY = "homey_consumer_session";

function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function readAccounts(): StoredConsumerAccount[] {
  try {
    const raw = storage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredConsumerAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredConsumerAccount[]) {
  storage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function toPublic(account: StoredConsumerAccount): ConsumerAccount {
  const { passwordHash: _passwordHash, ...pub } = account;
  return pub;
}

export function getSubscriptionState(account: ConsumerAccount): SubscriptionState {
  if (account.canceledAt) return "canceled";
  return new Date(account.trialEndsAt).getTime() > Date.now() ? "trialing" : "active";
}

export function trialDaysLeft(account: ConsumerAccount): number {
  const ms = new Date(account.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function signUp(
  name: string,
  email: string,
  password: string,
): { account: ConsumerAccount } | { error: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts.some((a) => a.email === normalizedEmail)) {
    return { error: "An account with that email already exists. Try logging in instead." };
  }
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const account: StoredConsumerAccount = {
    id: Math.random().toString(36).slice(2, 10),
    name: name.trim(),
    email: normalizedEmail,
    createdAt: now.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
    canceledAt: null,
    passwordHash: hashPassword(password),
  };
  accounts.push(account);
  writeAccounts(accounts);
  storage.setItem(SESSION_KEY, account.id);
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return { account: toPublic(account) };
}

export function logIn(
  email: string,
  password: string,
): { account: ConsumerAccount } | { error: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readAccounts();
  const account = accounts.find((a) => a.email === normalizedEmail);
  if (!account || account.passwordHash !== hashPassword(password)) {
    return { error: "No account matches that email and password." };
  }
  storage.setItem(SESSION_KEY, account.id);
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return { account: toPublic(account) };
}

export function logOut() {
  storage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
}

export function getSession(): ConsumerAccount | null {
  const id = storage.getItem(SESSION_KEY);
  if (!id) return null;
  const account = readAccounts().find((a) => a.id === id);
  return account ? toPublic(account) : null;
}

export function cancelMembership(accountId: string): ConsumerAccount | null {
  const accounts = readAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return null;
  account.canceledAt = new Date().toISOString();
  writeAccounts(accounts);
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return toPublic(account);
}

export function resumeMembership(accountId: string): ConsumerAccount | null {
  const accounts = readAccounts();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return null;
  account.canceledAt = null;
  writeAccounts(accounts);
  window.dispatchEvent(new Event("homey-consumer-auth-change"));
  return toPublic(account);
}
