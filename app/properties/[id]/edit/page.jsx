import PropertyEditView from '@/components/views/PropertyEditView';

const PropertyEditPage = ({ params }) => {
  return <PropertyEditView id={params.id} />;
};

export default PropertyEditPage;
