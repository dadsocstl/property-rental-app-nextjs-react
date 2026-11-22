'use client';

import MessageCard from '@/components/MessageCard';
import { DatabaseError } from '@/components/RequireSession';
import Spinner from '@/components/Spinner';
import { useSession } from '@/context/SessionContext';
import { useMessages } from '@/hooks/use-data';

const MessagesView = () => {
  const { userId } = useSession();
  const { data: messages, error, isLoading } = useMessages(userId);

  if (error) return <DatabaseError error={error} />;
  if (isLoading) return <Spinner loading />;

  return messages.length === 0 ? (
    <p>You have no messages</p>
  ) : (
    messages.map((message) => <MessageCard key={message._id} message={message} />)
  );
};

export default MessagesView;
