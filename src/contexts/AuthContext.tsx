import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, AuthState } from '../types';

console.log('AuthContext.tsx loaded');

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, userData: any) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const profileFetchRetries = useRef<number>(0);

  useEffect(() => {
    let mounted = true

    // 起動時: 保存済みセッションを復元
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      if (data.session?.user) {
        fetchUserFromDatabase(data.session.user.id)
      } else {
        setLoading(false)
      }
    })

    // サインイン/アウトやトークン回転・失効を確実に反映
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchUserFromDatabase(session.user.id)
      } else {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, []);

  const createUserFromSession = (authUser: any) => {
    try {
      console.log('Creating user from session data:', authUser);
      
      // Fetch user data from database to get the correct role
      fetchUserFromDatabase(authUser.id);
    } catch (error) {
      console.error('Error creating user from session:', error);
      setUser(null);
      setLoading(false);
    }
  };

  const fetchUserFromDatabase = async (userId: string) => {
    try {
      console.log('Fetching user from database:', userId);
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user from database:', error);
        // If it's a permission error, the user might not exist yet
        if (error.code === 'PGRST301' || error.code === '42501') {
          console.log('User profile not found or permission denied, waiting for trigger...');
          setTimeout(() => fetchUserFromDatabase(userId), 2000);
          return;
        } else {
          setUser(null);
          setLoading(false);
          return;
        }
      }

      if (!userData) {
        profileFetchRetries.current += 1;
        console.log('User profile not found, retry #', profileFetchRetries.current);
        if (profileFetchRetries.current < 3) {
          setTimeout(() => fetchUserFromDatabase(userId), 1500);
          return;
        }

        // Fallback: build minimal user from auth metadata to allow app to proceed
        const { data: authUserResp } = await supabase.auth.getUser();
        const authUser = authUserResp?.user;
        const name = (authUser?.user_metadata as any)?.name || authUser?.email?.split('@')[0] || 'User';
        const role = (authUser?.user_metadata as any)?.role || 'client';
        const minimal: User = {
          id: userId,
          email: authUser?.email || '',
          name,
          role,
          created_at: new Date().toISOString(),
        } as User;
        console.warn('Using minimal user from auth metadata as fallback');
        setUser(minimal);
        setLoading(false);
        return;
      }

      console.log('User data from database:', userData);
      setUser(userData);
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchUserFromDatabase:', error);
      // Retry once more in case of temporary issues
      setTimeout(() => {
        setUser(null);
        setLoading(false);
      }, 1000);
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting signup process for:', email);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    });

    console.log('Supabase signup response:', { data, error });

    // Profile creation is now handled automatically by database trigger
    if (data.user && !error) {
      console.log('User created successfully, profile will be created automatically');
    }

    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext signIn called with:', email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    console.log('Supabase signIn response:', { data, error });
    return { data, error };
  };

  const signOut = async () => {
    // Clear local state first
    setUser(null);
    setLoading(false);
    
    try {
      // Check if there's an active user session before attempting signOut
      const { data: { user: activeUser }, error: getUserError } = await supabase.auth.getUser();
      
      // If there's no active user or error getting user, skip the signOut call
      if (getUserError || !activeUser) {
        console.log('No active session found, skipping signOut call');
        return;
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Check if it's an expected session-related error
        const isSessionError = error.message?.includes('Auth session missing') || 
                              error.message?.includes('Session from session_id claim in JWT does not exist') ||
                              error.message?.includes('session_not_found');
        
        if (isSessionError) {
          console.warn('Session already expired or missing during logout:', error.message);
        } else {
          console.error('Unexpected error during signout:', error);
        }
      }
    } catch (error) {
      // Handle any promise rejections or exceptions from the signOut call
      console.warn('Error during logout (handled gracefully):', error);
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};