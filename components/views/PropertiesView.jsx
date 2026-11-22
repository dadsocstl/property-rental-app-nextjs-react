'use client';

import Pagination from '@/components/Pagination';
import PropertyCard from '@/components/PropertyCard';
import { DatabaseError } from '@/components/RequireSession';
import Spinner from '@/components/Spinner';
import { useProperties } from '@/hooks/use-data';

const PropertiesView = ({ page, pageSize }) => {
  const { data, error, isLoading } = useProperties(page, pageSize);

  if (error) return <DatabaseError error={error} />;
  if (isLoading) return <Spinner loading />;

  const { total, properties } = data;

  return (
    <>
      {properties.length === 0 ? (
        <p>No properties found</p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {properties.map((property) => (
            <PropertyCard property={property} key={property._id} />
          ))}
        </div>
      )}
      {total > pageSize && <Pagination page={page} pageSize={pageSize} totalItems={total} />}
    </>
  );
};

export default PropertiesView;
