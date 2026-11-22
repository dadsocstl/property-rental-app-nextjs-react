'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSession } from '@/context/SessionContext';
import { useState } from 'react';

const ProfileDetails = ({ user }) => {
  const { updateProfile } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    try {
      await updateProfile({ name: formData.get('name'), email: formData.get('email') });
      setIsEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  };

  const startEditing = () => {
    setError('');
    setSaved(false);
    setIsEditing(true);
  };

  if (!isEditing) {
    return (
      <div className='flex flex-col gap-4'>
        <div>
          <span className='block text-sm font-semibold uppercase tracking-wider text-muted-foreground'>Name</span>
          <p className='text-xl break-words'>{user.name}</p>
        </div>
        <div>
          <span className='block text-sm font-semibold uppercase tracking-wider text-muted-foreground'>Email</span>
          <p className='text-xl break-all'>{user.email}</p>
        </div>
        {saved && (
          <p role='status' className='text-sm text-primary'>
            Profile updated.
          </p>
        )}
        <Button type='button' variant='outline' className='self-start' onClick={startEditing}>
          Edit profile
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='profile-name'>Name</Label>
        <Input
          id='profile-name'
          name='name'
          defaultValue={user.name}
          required
          maxLength={20}
          autoComplete='name'
        />
      </div>
      <div className='flex flex-col gap-2'>
        <Label htmlFor='profile-email'>Email</Label>
        <Input
          id='profile-email'
          name='email'
          type='email'
          defaultValue={user.email}
          required
          autoComplete='email'
        />
      </div>
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <div className='flex gap-2'>
        <Button type='submit' disabled={pending}>
          {pending ? 'Saving...' : 'Save changes'}
        </Button>
        <Button type='button' variant='ghost' disabled={pending} onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default ProfileDetails;
