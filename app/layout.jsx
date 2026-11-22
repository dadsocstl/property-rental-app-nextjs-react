import '@/assets/styles/globals.css';
import AuthProvider from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import { Inter, Space_Grotesk } from 'next/font/google';
import 'photoswipe/dist/photoswipe.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata = {
  title: 'Timeless Carat Properties | Find the perfect rental',
  description: 'Browse, bookmark and list rental properties: apartments, cabins, lofts and homes for short or long stays.',
  keywords: 'rental, property, real estate, apartments, vacation rentals',
  applicationName: 'Timeless Carat Properties',
  openGraph: {
    siteName: 'Timeless Carat Properties',
    title: 'Timeless Carat Properties',
    description: 'Browse, bookmark and list rental properties: apartments, cabins, lofts and homes for short or long stays.',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0B1F35',
  colorScheme: 'dark',
};

const MainLayout = ({ children }) => {
  return (
    <html lang='en' className={`${inter.variable} ${display.variable} bg-background`}>
      <body className='flex min-h-screen flex-col'>
        <AuthProvider>
          <Navbar />
          <main className='flex-1'>{children}</main>
          <Footer />
          <ToastContainer theme='dark' position='bottom-right' />
        </AuthProvider>
      </body>
    </html>
  );
};

export default MainLayout;
