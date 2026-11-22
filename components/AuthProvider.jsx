'use client';

import { SessionProvider } from '@/context/SessionContext';

const AuthProvider = ({ children }) => {
  return <SessionProvider>{children}</SessionProvider>;
};

export default AuthProvider;
