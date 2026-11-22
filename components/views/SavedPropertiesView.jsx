'use client';

import PropertyCard from '@/components/PropertyCard';
import { DatabaseError } from '@/components/RequireSession';
import Spinner from '@/components/Spinner';
import { useSession } from '@/context/SessionContext';
import { useBookmarks } from '@/hooks/use-data';

const SavedPropertiesView = () => {
  const { userId } = useSession();
  const { data: bookmarks, error, isLoading } = useBookmarks(userId);

  if (error) return <DatabaseError error={error} />;
  if (isLoading) return <Spinner loading />;

  return bookmarks.length === 0 ? (
    <p>No saved properties</p>
  ) : (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      {bookmarks.map((property) => (
        <PropertyCard key={property._id} property={property} />
      ))}
    </div>
  );
};

export default SavedPropertiesView;
