import lockup from '@/public/images/brand/logo-lockup-dark.png';
import mark from '@/public/images/brand/logo-mark.png';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const BRAND_NAME = 'Timeless Carat Properties';

export const BrandLockup = ({ className, priority = false }) => (
  <Image
    src={lockup}
    alt={BRAND_NAME}
    priority={priority}
    sizes='(min-width: 640px) 260px, 212px'
    className={cn('h-9 w-auto sm:h-11', className)}
  />
);

export const BrandMark = ({ className, priority = false }) => (
  <Image
    src={mark}
    alt={BRAND_NAME}
    priority={priority}
    sizes='64px'
    className={cn('h-10 w-auto', className)}
  />
);
