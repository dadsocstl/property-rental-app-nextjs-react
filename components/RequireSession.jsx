'use client';

import Spinner from '@/components/Spinner';
import { useSession } from '@/context/SessionContext';

const RequireSession = ({ children, message = 'Sign in to view this page' }) => {
  const { status, error, openSignIn } = useSession();

  if (error) return <DatabaseError error={error} />;
  if (status === 'loading') return <Spinner loading />;
  if (status === 'unauthenticated') {
    return (
      <section className='flex flex-col items-center gap-4 px-4 py-24 text-center'>
        <h1 className='text-2xl font-bold'>{message}</h1>
        <button
          type='button'
          onClick={openSignIn}
          className='rounded-md bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600'
        >
          Login or Register
        </button>
      </section>
    );
  }
  return children;
};

export function DatabaseError({ error }) {
  return (
    <p role='alert' className='mx-auto my-10 max-w-xl text-center text-red-600'>
      Could not load the browser database: {error.message}
    </p>
  );
}

export default RequireSession;
