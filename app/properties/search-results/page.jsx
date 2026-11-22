import PropertySearchForm from '@/components/PropertySearchForm';
import SearchResultsView from '@/components/views/SearchResultsView';
import Link from 'next/link';
import { FaArrowAltCircleLeft } from 'react-icons/fa';

const SearchResultsPage = ({ searchParams: { location = '', propertyType = 'All' } }) => {
  return (
    <>
      <section className='bg-primary py-4'>
        <div className='max-w-7xl mx-auto px-4 flex flex-col items-start sm:px-6 lg:px-8'>
          <PropertySearchForm />
        </div>
      </section>
      <section className='px-4 py-6'>
        <div className='container-xl lg:container m-auto px-4 py-6'>
          <Link href='/properties' className='flex items-center text-primary hover:underline mb-3'>
            <FaArrowAltCircleLeft className='mr-2 mb-1' /> Back To Properties
          </Link>
          <h1 className='text-2xl mb-4'>Search Results</h1>
          <SearchResultsView location={location} propertyType={propertyType} />
        </div>
      </section>
    </>
  );
};

export default SearchResultsPage;
