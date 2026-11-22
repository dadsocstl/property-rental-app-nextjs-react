'use client';

import SignInDialog from '@/components/SignInDialog';
import { refreshDb, useSessionUser } from '@/hooks/use-data';
import * as data from '@/lib/data';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { data: user, error, isLoading } = useSessionUser();
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  const signIn = useCallback(async (credentials) => {
    await data.signIn(credentials);
    await refreshDb();
    setIsSignInOpen(false);
  }, []);

  const signOut = useCallback(async () => {
    await data.signOut();
    await refreshDb();
  }, []);

  const value = useMemo(
    () => ({
      session: user ? { user } : null,
      userId: user?.id ?? null,
      status: isLoading ? 'loading' : user ? 'authenticated' : 'unauthenticated',
      error,
      openSignIn: () => setIsSignInOpen(true),
      signIn,
      signOut,
    }),
    [user, isLoading, error, signIn, signOut]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      <SignInDialog open={isSignInOpen} onClose={() => setIsSignInOpen(false)} onSubmit={signIn} />
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
