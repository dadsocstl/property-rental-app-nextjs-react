'use client';

import FeaturedPropertyCard from '@/components/FeaturedPropertyCard';
import Reveal from '@/components/motion/Reveal';
import SectionHeading from '@/components/SectionHeading';
import { useFeaturedProperties } from '@/hooks/use-data';

const FeaturedProperties = () => {
  const { data: properties = [] } = useFeaturedProperties();

  if (properties.length === 0) return null;

  return (
    <section className='bg-muted py-20'>
      <div className='container flex flex-col gap-10'>
        <SectionHeading eyebrow='Hand-picked' title='Featured properties' />
        <Reveal className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {properties.map((property) => (
            <FeaturedPropertyCard key={property._id} property={property} />
          ))}
        </Reveal>
      </div>
    </section>
  );
};

export default FeaturedProperties;
