import { Badge } from '@/components/ui/badge';
import { formatRate } from '@/lib/utils';
import { ArrowUpRight, Bath, BedDouble, MapPin, Ruler } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const PropertyCard = ({ property }) => {
  const rate = formatRate(property.rates);

  return (
    <Link
      href={`/properties/${property._id}`}
      className='group flex flex-col overflow-hidden rounded-2xl border bg-card text-card-foreground transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    >
      <div className='relative aspect-[4/3] overflow-hidden'>
        <Image
          src={property.images[0]}
          alt={property.name}
          fill
          sizes='(min-width: 768px) 33vw, 100vw'
          className='object-cover transition-transform duration-700 ease-out group-hover:scale-105'
        />
        <Badge className='absolute left-3 top-3 bg-background/85 text-foreground backdrop-blur'>{property.type}</Badge>
        <div className='absolute bottom-3 right-3 rounded-full bg-primary px-4 py-1.5 font-display font-bold text-primary-foreground'>
          {rate.amount}
          <span className='text-sm font-medium'>{rate.unit}</span>
        </div>
      </div>

      <div className='flex flex-1 flex-col gap-4 p-5'>
        <div className='flex items-start justify-between gap-3'>
          <h3 className='font-display text-xl font-semibold leading-snug'>{property.name}</h3>
          <ArrowUpRight className='size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary' />
        </div>
        <p className='flex items-center gap-1.5 text-sm text-accent'>
          <MapPin className='size-4' />
          {property.location.city}, {property.location.state}
        </p>
        <ul className='mt-auto flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm text-muted-foreground'>
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
      </div>
    </Link>
  );
};

export default PropertyCard;
