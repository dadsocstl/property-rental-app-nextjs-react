'use client';

import PropertyEditForm from '@/components/PropertyEditForm';
import RequireSession, { DatabaseError } from '@/components/RequireSession';
import Spinner from '@/components/Spinner';
import { useSession } from '@/context/SessionContext';
import { useProperty } from '@/hooks/use-data';

const EditContent = ({ id }) => {
  const { userId } = useSession();
  const { data: property, error, isLoading } = useProperty(id);

  if (error) return <DatabaseError error={error} />;
  if (isLoading) return <Spinner loading />;
  if (!property) {
    return <h1 className='text-center text-2xl font-bold mt-10'>Property Not Found</h1>;
  }
  if (property.owner !== userId) {
    return <h1 className='text-center text-2xl font-bold mt-10'>You can only edit your own listings</h1>;
  }

  return (
    <section className='bg-background'>
      <div className='container m-auto max-w-2xl py-24'>
        <div className='bg-card px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0'>
          <PropertyEditForm property={property} />
        </div>
      </div>
    </section>
  );
};

const PropertyEditView = ({ id }) => (
  <RequireSession message='Sign in to edit this property'>
    <EditContent id={id} />
  </RequireSession>
);

export default PropertyEditView;
