'use client';

import FormDialog from '@/components/admin/FormDialog';
import {
  EmptyRow,
  Field,
  FilterTabs,
  PageHeader,
  QueryState,
  Select,
  StatusBadge,
  TableShell,
  Td,
  Th,
  humanize,
  money,
  shortDate,
} from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAction, useUnits, useVendors, useWorkOrders } from '@/hooks/use-admin';
import * as admin from '@/lib/admin';
import { Plus } from 'lucide-react';
import { useState } from 'react';

function NewWorkOrderDialog({ vendors }) {
  const { data: units } = useUnits();
  return (
    <FormDialog
      title='New work order'
      description='The current tenant is linked automatically. Choosing a vendor marks it assigned.'
      submitLabel='Create work order'
      action={admin.addWorkOrder}
      trigger={
        <Button>
          <Plus /> New work order
        </Button>
      }
    >
      <Field label='Title' htmlFor='wo-title' className='sm:col-span-2'>
        <Input id='wo-title' name='title' required placeholder='Dishwasher not draining' />
      </Field>
      <Field label='Unit' htmlFor='wo-unit' className='sm:col-span-2'>
        <Select id='wo-unit' name='unitId' defaultValue=''>
          <option value=''>Not unit-specific</option>
          {(units ?? []).map((u) => (
            <option key={u.id} value={u.id}>
              {u.property_name} · {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Priority' htmlFor='wo-priority'>
        <Select id='wo-priority' name='priority' defaultValue='normal'>
          {admin.WORK_ORDER_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {humanize(p)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Vendor' htmlFor='wo-vendor'>
        <Select id='wo-vendor' name='vendorId' defaultValue=''>
          <option value=''>Unassigned</option>
          {(vendors ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Details' htmlFor='wo-description' className='sm:col-span-2'>
        <Textarea id='wo-description' name='description' rows={3} />
      </Field>
    </FormDialog>
  );
}

function AddVendorDialog() {
  return (
    <FormDialog
      title='Add vendor'
      submitLabel='Add vendor'
      action={admin.addVendor}
      trigger={
        <Button variant='outline' size='sm'>
          <Plus /> Add vendor
        </Button>
      }
    >
      <Field label='Name' htmlFor='vendor-name' className='sm:col-span-2'>
        <Input id='vendor-name' name='name' required />
      </Field>
      <Field label='Trade' htmlFor='vendor-category'>
        <Select id='vendor-category' name='category' defaultValue='general'>
          {admin.VENDOR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {humanize(c)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label='Phone' htmlFor='vendor-phone'>
        <Input id='vendor-phone' name='phone' type='tel' />
      </Field>
      <Field label='Email' htmlFor='vendor-email' className='sm:col-span-2'>
        <Input id='vendor-email' name='email' type='email' />
      </Field>
    </FormDialog>
  );
}

function WorkOrderRow({ order, vendors }) {
  const { run, pending } = useAdminAction();
  const update = (changes) => run(() => admin.updateWorkOrder(order.id, { status: order.status, ...changes }));

  return (
    <tr className='hover:bg-secondary/20'>
      <Td className='font-medium'>
        {order.title}
        <span className='block text-xs font-normal text-muted-foreground'>
          Opened {shortDate(order.created_at)}
          {order.first_name ? ` · ${order.first_name} ${order.last_name}` : ''}
        </span>
      </Td>
      <Td className='text-muted-foreground'>
        {order.property_name ? `${order.property_name} · ${order.unit_name}` : '—'}
      </Td>
      <Td>
        <StatusBadge status={order.priority} />
      </Td>
      <Td>
        <Select
          aria-label={`Vendor for ${order.title}`}
          value={order.vendor_id ?? ''}
          disabled={pending}
          className='w-44'
          onChange={(e) =>
            update({
              vendorId: e.target.value,
              status: e.target.value && order.status === 'open' ? 'assigned' : order.status,
            })
          }
        >
          <option value=''>Unassigned</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </Td>
      <Td>
        <Select
          aria-label={`Status of ${order.title}`}
          value={order.status}
          disabled={pending}
          className='w-36'
          onChange={(e) => update({ status: e.target.value })}
        >
          {admin.WORK_ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
      </Td>
      <Td className='text-right tabular-nums text-muted-foreground'>
        {order.cost_cents !== null ? money(order.cost_cents) : '—'}
      </Td>
    </tr>
  );
}

export default function MaintenanceView() {
  const [filter, setFilter] = useState('active');
  const { data: orders, error, isLoading } = useWorkOrders();
  const { data: vendors } = useVendors();

  const isActive = (o) => ['open', 'assigned', 'in_progress'].includes(o.status);
  const activeCount = (orders ?? []).filter(isActive).length;
  const visible = (orders ?? []).filter((o) => (filter === 'active' ? isActive(o) : !isActive(o)));

  return (
    <>
      <PageHeader title='Maintenance' description='Track repair requests from report to completion and dispatch vendors.'>
        <NewWorkOrderDialog vendors={vendors} />
      </PageHeader>

      <FilterTabs
        label='Filter work orders'
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'Active', count: activeCount },
          { value: 'closed', label: 'Closed', count: (orders?.length ?? 0) - activeCount },
        ]}
      />

      <QueryState error={error} isLoading={isLoading}>
        <TableShell label='Work orders'>
          <thead>
            <tr>
              <Th>Issue</Th>
              <Th>Unit</Th>
              <Th>Priority</Th>
              <Th>Vendor</Th>
              <Th>Status</Th>
              <Th className='text-right'>Cost</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && <EmptyRow colSpan={6}>Nothing here.</EmptyRow>}
            {visible.map((o) => (
              <WorkOrderRow key={o.id} order={o} vendors={vendors ?? []} />
            ))}
          </tbody>
        </TableShell>
      </QueryState>

      <section aria-labelledby='vendors-heading' className='flex flex-col gap-4'>
        <div className='flex items-center justify-between gap-2'>
          <h2 id='vendors-heading' className='text-xl font-semibold'>
            Vendors
          </h2>
          <AddVendorDialog />
        </div>
        <ul className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
          {(vendors ?? []).map((v) => (
            <li key={v.id} className='flex flex-col gap-1 rounded-xl border border-border/70 bg-card/50 p-4'>
              <p className='font-medium'>{v.name}</p>
              <p className='text-sm capitalize text-muted-foreground'>{humanize(v.category)}</p>
              <p className='text-sm tabular-nums text-muted-foreground'>{v.phone ?? v.email ?? 'No contact'}</p>
              <p className='mt-1 text-xs font-semibold text-primary'>
                {v.active_jobs} active job{v.active_jobs === 1 ? '' : 's'}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
