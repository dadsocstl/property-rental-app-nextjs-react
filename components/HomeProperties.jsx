'use client';

import Reveal from '@/components/motion/Reveal';
import { DatabaseError } from '@/components/RequireSession';
import SectionHeading from '@/components/SectionHeading';
import Spinner from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { useRecentProperties } from '@/hooks/use-data';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import PropertyCard from './PropertyCard';

const HomeProperties = () => {
  const { data: recentProperties, error, isLoading } = useRecentProperties();

  return (
    <section className='container flex flex-col gap-10 py-20'>
      <div className='flex flex-col justify-between gap-6 md:flex-row md:items-end'>
        <SectionHeading eyebrow='Just listed' title='Recent properties' />
        <Button asChild variant='outline'>
          <Link href='/properties'>
            View all properties <ArrowRight />
          </Link>
        </Button>
      </div>
      {error ? (
        <DatabaseError error={error} />
      ) : isLoading ? (
        <Spinner loading />
      ) : recentProperties.length === 0 ? (
        <p className='text-muted-foreground'>No properties found.</p>
      ) : (
        <Reveal className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {recentProperties.map((property) => (
            <PropertyCard key={property._id} property={property} />
          ))}
        </Reveal>
      )}
    </section>
  );
};

export default HomeProperties;
