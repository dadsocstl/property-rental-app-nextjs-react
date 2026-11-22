'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const PROPERTY_TYPES = [
  ['All', 'All types'],
  ['Apartment', 'Apartment'],
  ['Studio', 'Studio'],
  ['Condo', 'Condo'],
  ['House', 'House'],
  ['Cabin Or Cottage', 'Cabin or Cottage'],
  ['Loft', 'Loft'],
  ['Room', 'Room'],
  ['Other', 'Other'],
];

const PropertySearchForm = () => {
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('All');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (location === '' && propertyType === 'All') {
      router.push('/properties');
      return;
    }
    const query = new URLSearchParams({ location, propertyType });
    router.push(`/properties/search-results?${query}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role='search'
      className='flex w-full flex-col gap-2 rounded-2xl border border-border bg-card/90 p-2 shadow-2xl backdrop-blur md:flex-row md:items-center md:rounded-full'
    >
      <div className='relative flex-1'>
        <label htmlFor='location' className='sr-only'>
          Location
        </label>
        <MapPin className='pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-primary' />
        <Input
          id='location'
          placeholder='City, state or keyword'
          className='h-12 rounded-full border-0 bg-transparent pl-11 focus-visible:ring-1'
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>
      <div className='hidden h-8 w-px bg-border md:block' />
      <div className='md:w-52'>
        <label htmlFor='property-type' className='sr-only'>
          Property Type
        </label>
        <select
          id='property-type'
          className='h-12 w-full rounded-full bg-transparent px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
        >
          {PROPERTY_TYPES.map(([value, label]) => (
            <option key={value} value={value} className='bg-card'>
              {label}
            </option>
          ))}
        </select>
      </div>
      <Button type='submit' size='lg' className='h-12'>
        <Search />
        Search
      </Button>
    </form>
  );
};

export default PropertySearchForm;
