'use client';

import Spinner from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { useSession } from '@/context/SessionContext';

const RequireSession = ({ children, message = 'Sign in to view this page' }) => {
  const { status, error, openSignIn } = useSession();

  if (error) return <DatabaseError error={error} />;
  if (status === 'loading') return <Spinner loading />;
  if (status === 'unauthenticated') {
    return (
      <section className='flex flex-col items-center gap-6 px-4 py-32 text-center'>
        <h1 className='text-balance font-display text-4xl font-bold'>{message}</h1>
        <Button size='lg' onClick={openSignIn}>
          Login or Register
        </Button>
      </section>
    );
  }
  return children;
};

export function DatabaseError({ error }) {
  return (
    <p role='alert' className='mx-auto my-10 max-w-xl text-center text-destructive'>
      Could not load the browser database: {error.message}
    </p>
  );
}

export default RequireSession;
