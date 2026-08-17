// Local "demo accounts" for builder membership — no backend, no database.
// Everything lives in localStorage. The password hash below is a simple
// non-cryptographic checksum, adequate only because this data never leaves
// the browser; it is not a real auth system.

import { storage } from "./storage";

export interface BuilderAccount {
  id: string;
  businessName: string;
  email: string;
  state: string;
  createdAt: string;
}

interface StoredAccount extends BuilderAccount {
  passwordHash: string;
}

const ACCOUNTS_KEY = "homey_demo_accounts";
const SESSION_KEY = "homey_demo_session";

function hashPassword(password: string): string {
  let hash = 5381;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 33) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function readAccounts(): StoredAccount[] {
  try {
    const raw = storage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: StoredAccount[]) {
  storage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function toPublic(account: StoredAccount): BuilderAccount {
  const { passwordHash: _passwordHash, ...pub } = account;
  return pub;
}

export function signUp(
  businessName: string,
  email: string,
  password: string,
  state: string,
): { account: BuilderAccount } | { error: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readAccounts();
  if (accounts.some((a) => a.email === normalizedEmail)) {
    return { error: "An account with that email already exists. Try logging in instead." };
  }
  const account: StoredAccount = {
    id: Math.random().toString(36).slice(2, 10),
    businessName: businessName.trim(),
    email: normalizedEmail,
    state,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(password),
  };
  accounts.push(account);
  writeAccounts(accounts);
  storage.setItem(SESSION_KEY, account.id);
  window.dispatchEvent(new Event("homey-auth-change"));
  return { account: toPublic(account) };
}

export function logIn(
  email: string,
  password: string,
): { account: BuilderAccount } | { error: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = readAccounts();
  const account = accounts.find((a) => a.email === normalizedEmail);
  if (!account || account.passwordHash !== hashPassword(password)) {
    return { error: "No account matches that email and password." };
  }
  storage.setItem(SESSION_KEY, account.id);
  window.dispatchEvent(new Event("homey-auth-change"));
  return { account: toPublic(account) };
}

export function logOut() {
  storage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("homey-auth-change"));
}

export function getSession(): BuilderAccount | null {
  const id = storage.getItem(SESSION_KEY);
  if (!id) return null;
  const account = readAccounts().find((a) => a.id === id);
  return account ? toPublic(account) : null;
}

// Real member accounts signed up in this browser — used by the builder
// directory to surface actual members alongside the seeded sample ones.
export function getAllAccounts(): BuilderAccount[] {
  return readAccounts().map(toPublic);
}
