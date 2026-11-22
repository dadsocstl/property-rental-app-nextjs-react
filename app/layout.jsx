import '@/assets/styles/globals.css';
import AuthProvider from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import 'photoswipe/dist/photoswipe.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const metadata = {
  title: 'PropertyRental',
  description: 'Find The Perfect Rental Property',
  keywords: 'rental, property, real estate',
};

const MainLayout = ({ children }) => {
  return (
    <html lang='en'>
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
};

export default MainLayout;
