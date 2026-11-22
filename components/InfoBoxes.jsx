import InfoBox from './InfoBox';
import Reveal from './motion/Reveal';

const InfoBoxes = () => {
  return (
    <section className='container py-16'>
      <Reveal className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <InfoBox heading='For Renters' eyebrow='Browse' buttonInfo={{ text: 'Browse Properties', link: '/properties' }}>
          Find your dream rental property. Bookmark properties and contact owners directly.
        </InfoBox>
        <InfoBox
          heading='For Property Owners'
          eyebrow='List'
          highlight
          buttonInfo={{ text: 'Add Property', link: '/properties/add' }}
        >
          List your properties and reach potential tenants. Rent as a short stay or long term.
        </InfoBox>
      </Reveal>
    </section>
  );
};

export default InfoBoxes;
