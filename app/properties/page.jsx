import PropertySearchForm from '@/components/PropertySearchForm';
import PropertiesView from '@/components/views/PropertiesView';

const PropertiesPage = ({ searchParams: { pageSize = 9, page = 1 } }) => {
  return (
    <>
      <section className='bg-primary py-4'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-start'>
          <PropertySearchForm />
        </div>
      </section>
      <section className='px-4 py-6'>
        <div className='container-xl lg:container m-auto px-4 py-6'>
          <h1 className='text-2xl mb-4'>Browse Properties</h1>
          <PropertiesView page={parseInt(page) || 1} pageSize={parseInt(pageSize) || 9} />
        </div>
      </section>
    </>
  );
};

export default PropertiesPage;
