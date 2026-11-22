import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatRate } from '@/lib/utils';
import { ArrowRight, Bath, BedDouble, MapPin, Ruler } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const FeaturedPropertyCard = ({ property }) => {
  const rate = formatRate(property.rates);
  const terms = ['nightly', 'weekly', 'monthly'].filter((term) => property.rates[term]);

  return (
    <article className='flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground md:flex-row'>
      <div className='relative aspect-[4/3] md:aspect-auto md:w-2/5'>
        <Image
          src={property.images[0]}
          alt={property.name}
          fill
          sizes='(min-width: 768px) 25vw, 100vw'
          className='object-cover'
        />
      </div>
      <div className='flex flex-1 flex-col gap-4 p-6'>
        <div className='flex items-center justify-between gap-3'>
          <Badge variant='outline'>{property.type}</Badge>
          <p className='font-display text-2xl font-bold text-primary'>
            {rate.amount}
            <span className='text-sm font-medium text-muted-foreground'>{rate.unit}</span>
          </p>
        </div>
        <h3 className='font-display text-2xl font-semibold leading-tight'>{property.name}</h3>
        <p className='flex items-center gap-1.5 text-sm text-accent'>
          <MapPin className='size-4' />
          {property.location.city}, {property.location.state}
        </p>
        <ul className='flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground'>
          <li className='flex items-center gap-1.5'>
            <BedDouble className='size-4' /> {property.beds} Beds
          </li>
          <li className='flex items-center gap-1.5'>
            <Bath className='size-4' /> {property.baths} Baths
          </li>
          <li className='flex items-center gap-1.5'>
            <Ruler className='size-4' /> {property.square_feet} sqft
          </li>
        </ul>
        <div className='mt-auto flex flex-wrap items-center justify-between gap-3 border-t pt-4'>
          <p className='text-xs uppercase tracking-wider text-muted-foreground'>{terms.join(' · ')}</p>
          <Button asChild size='sm'>
            <Link href={`/properties/${property._id}`}>
              Details <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
};

export default FeaturedPropertyCard;
