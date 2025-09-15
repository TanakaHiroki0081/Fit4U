import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

// Supabase プロジェクトの ref（例: rlvjlknc...）
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]

// このビルドが動作しているホスト名を名前空間に含めて、Duplicate/バックアップ/独自ドメインで自動分離
const hostNs =
  typeof window !== 'undefined'
    ? window.location.host.replace(/[^a-z0-9-_.]/gi, '_')
    : 'nohost'

// セッション保存キー（LocalStorage用）
// 例: sb-rlvjlknc-20250817-0bwb.bolt.host-fit4u-auth-v1
const storageKey = `sb-${projectRef}-${hostNs}-fit4u-auth-v1`

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey, // ← セッション衝突防止の要
  },
})

// Auth helpers
export const signUp = async (email: string, password: string, userData: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}