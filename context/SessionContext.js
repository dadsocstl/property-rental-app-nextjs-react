'use client';

import SignInDialog from '@/components/SignInDialog';
import { refreshDb, useSessionUser } from '@/hooks/use-data';
import * as data from '@/lib/data';
import { DEFAULT_DEV_ACCOUNT, DEV_BYPASS, devSignedOut, setDevSignedOut } from '@/lib/dev';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { data: user, error, isLoading } = useSessionUser();
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isAutoSigningIn, setIsAutoSigningIn] = useState(false);
  const autoSignInAttempted = useRef(false);

  const signIn = useCallback(async (credentials) => {
    await data.signIn(credentials);
    setDevSignedOut(false);
    await refreshDb();
    setIsSignInOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    await data.signOut();
    setDevSignedOut(true);
    await refreshDb();
  }, []);

  const updateProfile = useCallback(
    async (fields) => {
      if (!user) throw new Error('You must be signed in to do that');
      await data.updateProfile(user.id, fields);
      await refreshDb();
    },
    [user]
  );

  useEffect(() => {
    if (!DEV_BYPASS || isLoading || error || user || autoSignInAttempted.current) return;
    autoSignInAttempted.current = true;
    if (devSignedOut()) return;
    setIsAutoSigningIn(true);
    signIn(DEFAULT_DEV_ACCOUNT)
      .catch((err) => console.error('Dev auto sign-in failed:', err))
      .finally(() => setIsAutoSigningIn(false));
  }, [isLoading, error, user, signIn]);

  const status = isLoading || isAutoSigningIn ? 'loading' : user ? 'authenticated' : 'unauthenticated';

  const value = useMemo(
    () => ({
      session: user ? { user } : null,
      userId: user?.id ?? null,
      status,
      error,
      isDevBypass: DEV_BYPASS,
      openSignIn: () => setIsSignInOpen(true),
      signIn,
      signOut,
      updateProfile,
    }),
    [user, status, error, signIn, signOut, updateProfile]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      <SignInDialog open={isSignInOpen} onOpenChange={setIsSignInOpen} onSubmit={signIn} />
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
