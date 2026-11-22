import PropertyView from '@/components/views/PropertyView';

const PropertyPage = ({ params }) => {
  return <PropertyView id={params.id} />;
};

export default PropertyPage;
