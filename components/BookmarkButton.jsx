'use client';

import { useSession } from '@/context/SessionContext';
import { refreshDb, useBookmarkStatus } from '@/hooks/use-data';
import { toggleBookmark } from '@/lib/data';
import { FaBookmark } from 'react-icons/fa';
import { toast } from 'react-toastify';

const BookmarkButton = ({ property }) => {
  const { userId, status, openSignIn } = useSession();
  const { data: isBookmarked = false, isLoading } = useBookmarkStatus(userId, property._id);

  const handleClick = async () => {
    if (!userId) {
      toast.error('You need to sign in to bookmark a property');
      openSignIn();
      return;
    }

    try {
      const res = await toggleBookmark(userId, property._id);
      await refreshDb();
      toast.success(res.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (status === 'loading' || isLoading) return <p className='text-center'>Loading...</p>;

  return isBookmarked ? (
    <button
      onClick={handleClick}
      className='bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold w-full py-2 px-4 rounded-full flex items-center justify-center'
    >
      <FaBookmark className='mr-2' /> Remove Bookmark
    </button>
  ) : (
    <button
      onClick={handleClick}
      className='bg-primary hover:bg-accent text-primary-foreground font-bold w-full py-2 px-4 rounded-full flex items-center justify-center'
    >
      <FaBookmark className='mr-2' /> Bookmark Property
    </button>
  );
};

export default BookmarkButton;
