'use client';

import PropertyCard from '@/components/PropertyCard';
import { DatabaseError } from '@/components/RequireSession';
import Spinner from '@/components/Spinner';
import { useSearchResults } from '@/hooks/use-data';

const SearchResultsView = ({ location, propertyType }) => {
  const { data: properties, error, isLoading } = useSearchResults(location, propertyType);

  if (error) return <DatabaseError error={error} />;
  if (isLoading) return <Spinner loading />;

  return properties.length === 0 ? (
    <p>No search results found</p>
  ) : (
    <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
      {properties.map((property) => (
        <PropertyCard key={property._id} property={property} />
      ))}
    </div>
  );
};

export default SearchResultsView;
