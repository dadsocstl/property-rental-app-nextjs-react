'use client';

import { useSession } from '@/context/SessionContext';
import { useUnreadCount } from '@/hooks/use-data';

const UnreadMessageCount = () => {
  const { userId } = useSession();
  const { data: unreadCount = 0 } = useUnreadCount(userId);

  return unreadCount > 0 ? (
    <span className='absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-destructive-foreground transform translate-x-1/2 -translate-y-1/2 bg-destructive rounded-full'>
      {unreadCount}
    </span>
  ) : null;
};

export default UnreadMessageCount;
