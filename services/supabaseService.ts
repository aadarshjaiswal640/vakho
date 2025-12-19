// src/services/supabaseService.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * ------------------------
 *  Put your mock classes here
 *  (copy the MockAuth and MockQueryBuilder code you already have)
 * ------------------------
 */
// --- BEGIN MOCK (paste your MockAuth/MockQueryBuilder/helpers here) ---
type AuthChangeEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED';
type Session = { access_token: string; user: { id: string; email: string } } | null;

const STORAGE_KEY_SESSION = 'vak_session';
const STORAGE_KEY_PROFILES = 'vak_profiles';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const generateUserId = (email: string) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = ((hash << 5) - hash) + email.charCodeAt(i);
  return 'user_' + Math.abs(hash);
};

class MockAuth {
  private listeners: ((event: AuthChangeEvent, session: Session) => void)[] = [];

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session) => void) {
    this.listeners.push(callback);
    return { data: { subscription: { unsubscribe: () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    } } } };
  }

  private notify(event: AuthChangeEvent, session: Session) {
    this.listeners.forEach(l => l(event, session));
  }

  async signUp({ email, password }: any) {
    await delay(800);
    const userId = generateUserId(email);
    const user = { id: userId, email };
    const session = { access_token: 'mock_token_' + Date.now(), user };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    this.notify('SIGNED_IN', session);
    const profiles = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES) || '{}');
    if (!profiles[userId]) {
      profiles[userId] = {
        id: 'profile_' + userId,
        user_id: userId,
        email: email,
        name: email.split('@')[0],
        role: 'Aspiring Developer',
        bio: 'New to Vak AI.',
        goals: [],
        skills: [],
        swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
      };
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    }
    return { data: { user, session }, error: null };
  }

  async signInWithPassword({ email, password }: any) {
    await delay(800);
    if (!email || !password) return { data: { session: null }, error: { message: "Invalid credentials" } };
    const userId = generateUserId(email);
    const user = { id: userId, email };
    const session = { access_token: 'mock_token_' + Date.now(), user };
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    this.notify('SIGNED_IN', session);
    return { data: { session, user }, error: null };
  }

  async signOut() {
    await delay(300);
    localStorage.removeItem(STORAGE_KEY_SESSION);
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  async getSession() {
    const json = localStorage.getItem(STORAGE_KEY_SESSION);
    return { data: { session: json ? JSON.parse(json) : null }, error: null };
  }

  async getUser() {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user || null }, error: null };
  }
}

class MockQueryBuilder {
  private table: string;
  private filter: { column: string; value: any } | null = null;
  private isSingle = false;

  constructor(table: string) { this.table = table; }

  select(_cols = '*') { return this; }
  eq(column: string, value: any) { this.filter = { column, value }; return this; }
  single() { this.isSingle = true; return this; }

  async upsert(data: any) {
    await delay(500);
    const store = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES) || '{}');
    const key = data.user_id || data.id;
    if (!key) return { data: null, error: { message: "Missing user_id for upsert" } };
    const existing = store[key] || {};
    store[key] = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(store));
    return { data: store[key], error: null };
  }

  then(resolve: (data: { data: any; error: any }) => void) {
    delay(300).then(() => {
      const store = JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILES) || '{}');
      let result: any = null;
      if (this.filter && this.filter.column === 'user_id') result = store[this.filter.value];
      if ((result === undefined || result === null) && this.isSingle) {
        resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' } });
        return;
      }
      resolve({ data: result === undefined ? [] : result, error: null });
    });
  }
}
// --- END MOCK ---

// Build a mock supabase-like object:
const mockSupabase = {
  auth: new MockAuth(),
  from: (table: string) => new MockQueryBuilder(table)
};

// -------------------------
// Real supabase client setup
// -------------------------
const realUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const realAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const useMock = import.meta.env.VITE_USE_MOCK === 'true';

// simple runtime check to help debug missing envs
if (!useMock && (!realUrl || !realAnon)) {
  console.warn('Supabase env vars missing. Falling back to mock. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use real Supabase.');
}

const realSupabase: SupabaseClient | null = (!useMock && realUrl && realAnon)
  ? createClient(realUrl, realAnon)
  : null;

// Final export: choose mock or real
export const supabase = useMock || !realSupabase ? mockSupabase as any : realSupabase as any;

// Also export a boolean so your app can detect which mode it's in
export const IS_MOCK = useMock || !realSupabase;


