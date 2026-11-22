'use client';

import { useEffect, useRef, useState } from 'react';

const SignInDialog = ({ open, onClose, onSubmit }) => {
  const dialogRef = useRef(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      await onSubmit({ username: formData.get('username'), email: formData.get('email') });
      event.target.reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby='sign-in-title'
      className='w-full max-w-md rounded-xl p-0 shadow-xl backdrop:bg-black/50'
    >
      <form onSubmit={handleSubmit} className='flex flex-col gap-4 p-6'>
        <div className='flex flex-col gap-1'>
          <h2 id='sign-in-title' className='text-2xl font-bold text-gray-900'>
            Login or Register
          </h2>
          <p className='text-sm leading-relaxed text-gray-600'>
            Your profile, listings, bookmarks and messages are stored in a SQL database in this browser.
          </p>
        </div>
        <label className='flex flex-col gap-1 text-sm font-bold text-gray-700'>
          Name
          <input
            name='username'
            required
            maxLength={20}
            autoComplete='name'
            className='rounded border px-3 py-2 font-normal text-gray-700'
          />
        </label>
        <label className='flex flex-col gap-1 text-sm font-bold text-gray-700'>
          Email
          <input
            name='email'
            type='email'
            required
            autoComplete='email'
            className='rounded border px-3 py-2 font-normal text-gray-700'
          />
        </label>
        {error && (
          <p role='alert' className='text-sm text-red-600'>
            {error}
          </p>
        )}
        <div className='flex justify-end gap-2'>
          <button type='button' onClick={onClose} className='rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100'>
            Cancel
          </button>
          <button
            type='submit'
            disabled={pending}
            className='rounded-md bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600 disabled:opacity-60'
          >
            {pending ? 'Signing in...' : 'Continue'}
          </button>
        </div>
      </form>
    </dialog>
  );
};

export default SignInDialog;
