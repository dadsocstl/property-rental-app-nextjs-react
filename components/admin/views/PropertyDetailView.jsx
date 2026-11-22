'use client';

import FormDialog from '@/components/admin/FormDialog';
import { Field, PageHeader, QueryState, Select, StatusBadge, humanize, money, shortDate } from '@/components/admin/primitives';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAdminAction, usePropertyDetail } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { ArrowLeft, ExternalLink, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function UnitFields({ unit }) {
  return (
    <>
      <Field label='Unit name' htmlFor='unit-name'>
        <Input id='unit-name' name='name' required defaultValue={unit?.name} placeholder='Unit C' />
      </Field>
      <Field label='Market rent ($/mo)' htmlFor='marketRent'>
        <Input
          id='marketRent'
          name='marketRent'
          inputMode='decimal'
          defaultValue={unit ? (unit.market_rent_cents / 100).toString() : ''}
        />
      </Field>
      <Field label='Bedrooms' htmlFor='bedrooms'>
        <Input id='bedrooms' name='bedrooms' type='number' min='0' step='0.5' defaultValue={unit?.bedrooms ?? 1} />
      </Field>
      <Field label='Bathrooms' htmlFor='bathrooms'>
        <Input id='bathrooms' name='bathrooms' type='number' min='0' step='0.5' defaultValue={unit?.bathrooms ?? 1} />
      </Field>
      <Field label='Square feet' htmlFor='sqft'>
        <Input id='sqft' name='sqft' type='number' min='0' defaultValue={unit?.sqft ?? ''} />
      </Field>
    </>
  );
}

function Panel({ title, children, action }) {
  return (
    <section className='flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/50 p-6'>
      <div className='flex items-center justify-between gap-2'>
        <h2 className='text-lg font-semibold'>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function PropertyDetailView({ propertyId }) {
  const { data, error, isLoading } = usePropertyDetail(propertyId);
  const { run, pending } = useAdminAction();
  const router = useRouter();

  async function remove(property) {
    if (!window.confirm(`Delete ${property.name}? This cannot be undone.`)) return;
    if (await run(() => admin.removeProperty(propertyId))) router.push('/admin/properties');
  }

  if (!isLoading && !error && !data) {
    return (
      <div className='flex flex-col items-start gap-4 py-12'>
        <p className='text-muted-foreground'>This property no longer exists.</p>
        <Link href='/admin/properties' className={buttonVariants({ variant: 'outline' })}>
          <ArrowLeft /> Back to properties
        </Link>
      </div>
    );
  }

  const property = data?.property;
  const units = data?.units ?? [];
  const occupied = units.filter((u) => u.status === 'occupied').length;
  const rentRoll = units.reduce((sum, u) => sum + (u.lease_id ? u.rent_cents : 0), 0);
  const published = property?.listing_status === 'published';

  return (
    <>
      <Link href='/admin/properties' className='-mb-2 flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground'>
        <ArrowLeft className='size-4' /> All properties
      </Link>
      <QueryState error={error} isLoading={isLoading}>
        {property && (
          <>
            <PageHeader title={property.name} description={`${property.street}, ${property.city}, ${property.state} ${property.zipcode} · Landlord ${property.owner_name ?? 'unknown'}`}>
              <Button
                variant='outline'
                disabled={pending}
                onClick={() => run(() => admin.setListingStatus(propertyId, published ? 'draft' : 'published'))}
              >
                {published ? 'Unpublish' : 'Publish'}
              </Button>
              <Button
                variant='outline'
                disabled={pending || !published}
                onClick={() => run(() => admin.setListingFeatured(propertyId, !property.is_featured))}
              >
                <Star className={property.is_featured ? 'fill-primary text-primary' : ''} />
                {property.is_featured ? 'Featured' : 'Feature'}
              </Button>
              <Link href={`/properties/${propertyId}/edit`} className={buttonVariants({ variant: 'outline' })}>
                <Pencil /> Edit listing
              </Link>
              <Link href={`/properties/${propertyId}`} className={buttonVariants({ variant: 'outline' })}>
                <ExternalLink /> View public page
              </Link>
            </PageHeader>

            <div className='grid gap-6 lg:grid-cols-[18rem_1fr]'>
              <div className='flex flex-col gap-4'>
                {property.image && (
                  <Image src={property.image} alt='' width={400} height={300} className='aspect-[4/3] w-full rounded-2xl object-cover' />
                )}
                <dl className='grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70'>
                  {[
                    ['Listing', <StatusBadge key='s' status={property.listing_status} />],
                    ['Type', property.type],
                    ['Occupancy', `${occupied}/${units.length}`],
                    ['Rent roll', money(rentRoll)],
                  ].map(([label, value]) => (
                    <div key={label} className='flex flex-col gap-1 bg-card/70 p-4'>
                      <dt className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>{label}</dt>
                      <dd className='font-semibold tabular-nums'>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className='flex flex-col gap-6'>
                <Panel
                  title='Units'
                  action={
                    <FormDialog
                      title='Add unit'
                      description={`Add a leasable unit to ${property.name}.`}
                      submitLabel='Add unit'
                      action={(values) => admin.addUnit({ ...values, propertyId })}
                      trigger={
                        <Button size='sm'>
                          <Plus /> Add unit
                        </Button>
                      }
                    >
                      <UnitFields />
                    </FormDialog>
                  }
                >
                  {units.length === 0 ? (
                    <p className='py-6 text-center text-sm text-muted-foreground'>
                      No units yet. Add one so you can lease and track this property.
                    </p>
                  ) : (
                    <ul className='flex flex-col divide-y divide-border/50'>
                      {units.map((u) => (
                        <li key={u.id} className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
                          <div className='min-w-0'>
                            <p className='font-medium'>{u.name}</p>
                            <p className='text-sm text-muted-foreground'>
                              {u.bedrooms} bd · {u.bathrooms} ba{u.sqft ? ` · ${u.sqft.toLocaleString()} sqft` : ''} · Market {money(u.market_rent_cents)}
                            </p>
                          </div>
                          <div className='flex flex-wrap items-center gap-3'>
                            <span className='text-sm'>
                              {u.tenant_name ? (
                                <>
                                  {u.tenant_name}{' '}
                                  <span className='tabular-nums text-muted-foreground'>
                                    · {money(u.rent_cents)}/mo · ends {shortDate(u.end_date)}
                                  </span>
                                </>
                              ) : (
                                <span className='text-muted-foreground'>
                                  {u.days_in_status}d {humanize(u.status)} · {u.applicants} applicants
                                </span>
                              )}
                            </span>
                            {u.lease_id ? (
                              <StatusBadge status='occupied' />
                            ) : (
                              <Select
                                aria-label={`Status of ${u.name}`}
                                value={u.status}
                                disabled={pending}
                                className='w-36'
                                onChange={(e) => run(() => admin.setUnitStatus(u.id, e.target.value))}
                              >
                                {admin.UNIT_STATUSES.filter((s) => s !== 'occupied').map((s) => (
                                  <option key={s} value={s}>
                                    {humanize(s)}
                                  </option>
                                ))}
                              </Select>
                            )}
                            <FormDialog
                              title={`Edit ${u.name}`}
                              submitLabel='Save unit'
                              action={(values) => admin.updateUnit(u.id, values)}
                              trigger={
                                <Button variant='ghost' size='icon' aria-label={`Edit ${u.name}`}>
                                  <Pencil />
                                </Button>
                              }
                            >
                              <UnitFields unit={u} />
                            </FormDialog>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>

                <div className='grid gap-6 md:grid-cols-2'>
                  <Panel
                    title='Open maintenance'
                    action={
                      <Link href='/admin/maintenance' className='text-sm text-muted-foreground hover:text-foreground hover:underline'>
                        Manage
                      </Link>
                    }
                  >
                    {data.workOrders.length ? (
                      <ul className='flex flex-col divide-y divide-border/50'>
                        {data.workOrders.map((w) => (
                          <li key={w.id} className='flex items-center justify-between gap-3 py-2.5'>
                            <div className='min-w-0'>
                              <p className='truncate font-medium'>{w.title}</p>
                              <p className='text-sm text-muted-foreground'>{w.unit_name}</p>
                            </div>
                            <div className='flex shrink-0 gap-2'>
                              <StatusBadge status={w.priority} />
                              <StatusBadge status={w.status} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='py-6 text-center text-sm text-muted-foreground'>No open work orders.</p>
                    )}
                  </Panel>

                  <Panel
                    title='Applicants'
                    action={
                      <Link href='/admin/applications' className='text-sm text-muted-foreground hover:text-foreground hover:underline'>
                        Review
                      </Link>
                    }
                  >
                    {data.applications.length ? (
                      <ul className='flex flex-col divide-y divide-border/50'>
                        {data.applications.map((a) => (
                          <li key={a.id} className='flex items-center justify-between gap-3 py-2.5'>
                            <div className='min-w-0'>
                              <p className='truncate font-medium'>
                                {a.first_name} {a.last_name}
                              </p>
                              <p className='text-sm text-muted-foreground'>
                                {a.unit_name} · move-in {shortDate(a.desired_move_in)}
                              </p>
                            </div>
                            <StatusBadge status={a.status} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='py-6 text-center text-sm text-muted-foreground'>No applicants right now.</p>
                    )}
                  </Panel>
                </div>

                <div className='flex justify-end'>
                  <Button variant='ghost' className='text-destructive hover:text-destructive' disabled={pending} onClick={() => remove(property)}>
                    <Trash2 /> Delete property
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </QueryState>
    </>
  );
}
