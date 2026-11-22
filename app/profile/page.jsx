import RequireSession from '@/components/RequireSession';
import ProfileView from '@/components/views/ProfileView';

const ProfilePage = () => {
  return (
    <RequireSession message='Sign in to see your profile'>
      <ProfileView />
    </RequireSession>
  );
};

export default ProfilePage;
