import PropertyDetailView from '@/components/admin/views/PropertyDetailView';

export const metadata = { title: 'Property' };

export default async function AdminPropertyPage({ params }) {
  const { id } = await params;
  return <PropertyDetailView propertyId={id} />;
}
