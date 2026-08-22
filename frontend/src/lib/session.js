/*
 * Local account sessions — real enough to use, honest about what it is.
 *
 * Accounts live in this browser: a profile is an email + display name guarded
 * by a 4-6 digit PIN. The PIN is salted and SHA-256 hashed before it touches
 * localStorage, and nothing ever leaves the machine. The app scopes saved
 * portfolios and the budget per profile and personalizes briefings.
 */

const SESSION_KEY = "folio:session";
const ACCOUNTS_KEY = "folio:accounts:v1";

const normEmail = (email) => String(email).trim().toLowerCase().slice(0, 120);

function loadAccounts() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function setSession(account) {
  const session = { name: account.name, email: account.email, since: account.since };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/** Public shape only — never expose the hash. */
export function getAccount(email) {
  const a = loadAccounts()[normEmail(email)];
  return a ? { name: a.name, email: a.email, since: a.since, hasPin: !!a.pinHash, provider: a.provider || null } : null;
}

/** OAuth profiles (Google) have no PIN; the provider vouches for the email. */
export function oauthSignIn({ name, email, provider }) {
  const key = normEmail(email);
  const accounts = loadAccounts();
  if (!accounts[key]) {
    accounts[key] = {
      name: String(name || "").trim().slice(0, 60) || key.split("@")[0],
      email: key,
      provider,
      since: new Date().toISOString(),
    };
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
  return setSession(accounts[key]);
}

export async function createAccount({ name, email, pin }) {
  const accounts = loadAccounts();
  const key = normEmail(email);
  if (accounts[key]) return { ok: false, error: "exists" };
  const salt = crypto.getRandomValues(new Uint32Array(2)).join("-");
  accounts[key] = {
    name: String(name).trim().slice(0, 60),
    email: key,
    salt,
    pinHash: await hashPin(pin, salt),
    since: new Date().toISOString(),
  };
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return { ok: true, session: setSession(accounts[key]) };
}

export async function unlock({ email, pin }) {
  const a = loadAccounts()[normEmail(email)];
  if (!a) return { ok: false, error: "missing" };
  if ((await hashPin(pin, a.salt)) !== a.pinHash) return { ok: false, error: "pin" };
  return { ok: true, session: setSession(a) };
}

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (s && typeof s.email === "string" && typeof s.name === "string") return s;
  } catch {
    /* corrupted — treat as signed out */
  }
  return null;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

/** Portfolio-store key scoped to the signed-in profile (guests share one). */
export function portfolioStoreKey(session) {
  return session ? `folio:portfolios:v1:${session.email}` : "folio:portfolios:v1";
}

/** Investment amount, also scoped per profile. */
export function budgetStoreKey(session) {
  return session ? `folio:budget:${session.email}` : "folio:budget";
}

export function firstName(session) {
  return session?.name?.split(/\s+/)[0] || null;
}
