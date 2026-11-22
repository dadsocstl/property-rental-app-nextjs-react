import RequireSession from '@/components/RequireSession';
import MessagesView from '@/components/views/MessagesView';

const MessagePage = () => {
  return (
    <RequireSession message='Sign in to see your messages'>
      <section className='bg-blue-50'>
        <div className='container m-auto py-24 max-w-6xl'>
          <div className='bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0'>
            <h1 className='text-3xl font-bold mb-4'>Your Messages</h1>
            <div className='space-y-4'>
              <MessagesView />
            </div>
          </div>
        </div>
      </section>
    </RequireSession>
  );
};

export default MessagePage;
