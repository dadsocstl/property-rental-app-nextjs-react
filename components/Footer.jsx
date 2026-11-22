import { BrandLockup } from '@/components/BrandLogo';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='mt-24 border-t border-border bg-muted'>
      <div className='container flex flex-col items-center justify-between gap-6 py-10 md:flex-row'>
        <Link href='/' className='flex items-center rounded-lg'>
          <BrandLockup className='h-10 sm:h-10' />
        </Link>
        <ul className='flex gap-6 text-sm text-muted-foreground'>
          <li>
            <Link href='/properties' className='transition-colors hover:text-primary'>
              Properties
            </Link>
          </li>
          <li>
            <Link href='/terms' className='transition-colors hover:text-primary'>
              Terms of Service
            </Link>
          </li>
        </ul>
        <p className='text-sm text-muted-foreground'>&copy; {currentYear} Timeless Carat Properties. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
