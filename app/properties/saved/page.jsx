import RequireSession from '@/components/RequireSession';
import SavedPropertiesView from '@/components/views/SavedPropertiesView';

const SavedPropertiesPage = () => {
  return (
    <RequireSession message='Sign in to see your saved properties'>
      <section className='px-4 py-6'>
        <div className='container-xl lg:container m-auto px-4 py-6'>
          <h1 className='text-2xl mb-4'>Saved Properties</h1>
          <SavedPropertiesView />
        </div>
      </section>
    </RequireSession>
  );
};

export default SavedPropertiesPage;
