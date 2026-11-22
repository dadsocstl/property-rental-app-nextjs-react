'use client';

import { useSession } from '@/context/SessionContext';
import { refreshDb } from '@/hooks/use-data';
import { deleteProperty } from '@/lib/data';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'react-toastify';

const ProfileProperties = ({ properties }) => {
  const { userId } = useSession();

  const handleDeleteProperty = async (propertyId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this property?'
    );

    if (!confirmed) return;

    try {
      await deleteProperty(userId, propertyId);
      await refreshDb();
      toast.success('Property Deleted');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return properties.map((property) => (
    <div key={property._id} className='mb-10'>
      <Link href={`/properties/${property._id}`}>
        <Image
          className='h-32 w-full rounded-md object-cover'
          src={property.images[0]}
          alt=''
          width={500}
          height={100}
          priority={true}
        />
      </Link>
      <div className='mt-2'>
        <p className='text-lg font-semibold'>{property.name}</p>
        <p className='text-muted-foreground'>
          Address: {property.location.street} {property.location.city}{' '}
          {property.location.state}
        </p>
      </div>
      <div className='mt-2'>
        <Link
          href={`/properties/${property._id}/edit`}
          className='bg-primary text-primary-foreground px-3 py-3 rounded-md mr-2 hover:bg-accent'
        >
          Edit
        </Link>
        <button
          onClick={() => handleDeleteProperty(property._id)}
          className='bg-destructive text-destructive-foreground px-3 py-2 rounded-md hover:bg-destructive/90'
          type='button'
        >
          Delete
        </button>
      </div>
    </div>
  ));
};

export default ProfileProperties;
