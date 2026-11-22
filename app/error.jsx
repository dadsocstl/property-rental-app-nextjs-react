'use client';
import Link from 'next/link';
import { FaExclamationCircle } from 'react-icons/fa';

const ErrorPage = ({ error, reset }) => {
  console.log(error);
  return (
    <section className='bg-background min-h-screen flex-grow'>
      <div className='container m-auto max-w-2xl py-24'>
        <div className='bg-card px-6 py-24 mb-4 shadow-md rounded-md border m-4 md:m-0'>
          <div className='flex justify-center'>
            <FaExclamationCircle className='text-yellow-400 text-8xl fa-5x' />
          </div>
          <div className='text-center'>
            <h1 className='text-3xl font-bold mt-4 mb-2'>
              Something Went Wrong
            </h1>
            <p className='text-muted-foreground text-xl mb-10'>{error.toString()}</p>
            <Link
              href='/'
              className='bg-primary hover:bg-accent text-primary-foreground font-bold py-4 px-6 rounded'
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
      <div className='flex-grow'></div>
    </section>
  );
};

export default ErrorPage;
