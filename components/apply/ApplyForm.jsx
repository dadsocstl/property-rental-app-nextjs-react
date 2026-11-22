'use client';

import VerifyStep from '@/components/apply/VerifyStep';
import { Field, Select, money } from '@/components/admin/primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSession } from '@/context/SessionContext';
import { refreshDb } from '@/hooks/use-data';
import { useApplyableUnits, useVerificationConfig } from '@/hooks/use-apply';
import { submitApplication } from '@/lib/apply';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-toastify';

const newApplicantId = () => crypto.randomUUID().replace(/-/g, '');

export default function ApplyForm({ propertyId, initialUnitId, onSubmitted }) {
  const { session } = useSession();
  const { data: units, isLoading } = useApplyableUnits(propertyId);
  const { data: config } = useVerificationConfig();
  const [applicantId] = useState(newApplicantId);
  const [values, setValues] = useState({
    unitId: initialUnitId ?? '',
    firstName: '',
    lastName: '',
    email: session?.user?.email ?? '',
    phone: '',
    employer: '',
    statedIncome: '',
    desiredMoveIn: '',
    notes: '',
  });
  const [identity, setIdentity] = useState(null);
  const [income, setIncome] = useState(null);
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);

  const set = (field) => (event) => setValues((v) => ({ ...v, [field]: event.target.value }));
  const hasName = values.firstName.trim() && values.lastName.trim();
  const identityOk = identity && (identity.status === 'verified' || identity.status === 'review');
  const canSubmit = values.unitId && values.email.trim() && hasName && identityOk && consent && !pending;
  const unit = (units ?? []).find((u) => String(u.id) === String(values.unitId));
  const applicant = { firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.email.trim(), phone: values.phone.trim() };

  // Changing the name after a check would let someone verify as one person and apply as another.
  function changeName(field) {
    return (event) => {
      set(field)(event);
      setIdentity(null);
    };
  }

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    try {
      await submitApplication({ ...values, consent, identity, income });
      await refreshDb();
      toast.success('Application submitted');
      onSubmitted?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setPending(false);
    }
  }

  if (isLoading) return <p role='status' className='text-muted-foreground'>Loading units…</p>;
  if (!units?.length) {
    return (
      <p className='rounded-xl border border-border/70 bg-card/40 p-6 text-muted-foreground'>
        No units are open for applications on this property right now.{' '}
        <Link href='/properties' className='font-medium text-primary hover:underline'>
          Browse other properties
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className='flex flex-col gap-8'>
      <fieldset className='flex flex-col gap-4'>
        <legend className='mb-1 font-display text-lg font-bold'>1. About you</legend>
        <Field label='Unit' htmlFor='apply-unit'>
          <Select id='apply-unit' required value={values.unitId} onChange={set('unitId')}>
            <option value=''>Choose a unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.bedrooms} bd / {u.bathrooms} ba · {money(u.market_rent_cents)}/mo
              </option>
            ))}
          </Select>
        </Field>
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field label='First name' htmlFor='apply-first'>
            <Input id='apply-first' required autoComplete='given-name' value={values.firstName} onChange={changeName('firstName')} />
          </Field>
          <Field label='Last name' htmlFor='apply-last'>
            <Input id='apply-last' required autoComplete='family-name' value={values.lastName} onChange={changeName('lastName')} />
          </Field>
          <Field label='Email' htmlFor='apply-email'>
            <Input id='apply-email' type='email' required autoComplete='email' value={values.email} onChange={set('email')} />
          </Field>
          <Field label='Phone' htmlFor='apply-phone'>
            <Input id='apply-phone' type='tel' autoComplete='tel' value={values.phone} onChange={set('phone')} />
          </Field>
          <Field label='Employer' htmlFor='apply-employer'>
            <Input id='apply-employer' autoComplete='organization' value={values.employer} onChange={set('employer')} />
          </Field>
          <Field label='Monthly income ($)' htmlFor='apply-income' hint='What you earn before tax. Plaid can verify it below.'>
            <Input id='apply-income' inputMode='decimal' value={values.statedIncome} onChange={set('statedIncome')} />
          </Field>
          <Field label='Desired move-in' htmlFor='apply-move'>
            <Input id='apply-move' type='date' value={values.desiredMoveIn} onChange={set('desiredMoveIn')} />
          </Field>
        </div>
        <Field label='Anything the landlord should know?' htmlFor='apply-notes'>
          <Textarea id='apply-notes' rows={3} value={values.notes} onChange={set('notes')} />
        </Field>
      </fieldset>

      <div className='flex flex-col gap-4'>
        <h2 className='font-display text-lg font-bold'>2. Prove it&apos;s you</h2>
        <VerifyStep
          kind='identity'
          applicant={applicant}
          applicantId={applicantId}
          value={identity}
          onChange={setIdentity}
          disabled={!hasName}
          disabledReason='Enter your first and last name above first.'
          unavailable={config && !config.identity ? 'Identity verification is not available right now.' : undefined}
        />
        <VerifyStep
          kind='income'
          applicant={applicant}
          applicantId={applicantId}
          value={income}
          onChange={setIncome}
          disabled={!hasName}
          disabledReason='Enter your name above first.'
          unavailable={config && !config.income ? 'Income verification is not available right now.' : undefined}
        />
      </div>

      <div className='flex flex-col gap-4'>
        <h2 className='font-display text-lg font-bold'>3. Submit</h2>
        <label className='flex items-start gap-3 text-sm leading-relaxed'>
          <input type='checkbox' className='mt-1 size-4 accent-primary' checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>
            I authorise the landlord to review my application and the Plaid verification results above, and confirm the details I have
            given are accurate.
          </span>
        </label>
        {unit && (
          <p className='text-sm text-muted-foreground'>
            Applying for {unit.property_name} · {unit.name} at {money(unit.market_rent_cents)}/mo.
          </p>
        )}
        <div>
          <Button type='submit' size='lg' disabled={!canSubmit}>
            {pending ? 'Submitting…' : 'Submit application'}
          </Button>
          {!identityOk && <p className='mt-2 text-xs text-muted-foreground'>Verify your identity to submit.</p>}
        </div>
      </div>
    </form>
  );
}
