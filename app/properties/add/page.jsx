import PropertyAddForm from '@/components/PropertyAddForm';
import RequireSession from '@/components/RequireSession';

const PropertyAddPage = () => {
  return (
    <RequireSession message='Sign in to add a property'>
      <section className='bg-blue-50'>
        <div className='container m-auto max-w-2xl py-24'>
          <div className='bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0'>
            <PropertyAddForm />
          </div>
        </div>
      </section>
    </RequireSession>
  );
};

export default PropertyAddPage;
