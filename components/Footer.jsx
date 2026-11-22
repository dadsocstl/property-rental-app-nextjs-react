import logo from '@/assets/images/logo-white.png';
import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className='mt-24 border-t border-border bg-muted'>
      <div className='container flex flex-col items-center justify-between gap-6 py-10 md:flex-row'>
        <Link href='/' className='flex items-center gap-3'>
          <Image src={logo} alt='' className='h-8 w-auto' />
          <span className='font-display text-lg font-bold'>
            Timeless Carat <span className='text-primary'>Properties</span>
          </span>
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
