'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { UploadDropzone } from '@/components/upload-dropzone';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getMyOrganization, updateProfile } from '@/features/organization-profile/api';
import { useT } from '@/lib/i18n';

import { StepShell } from '../step-shell';

interface ProfileStepProps {
  slug: string;
  done: boolean;
  onSaved: () => void;
}

/**
 * What a client reads before deciding to book: a face, a name and a few
 * honest sentences.
 *
 * Four fields, not the full page-settings form. Everything else — sections,
 * Instagram, a second email — is a refinement of a page that has to exist
 * first, and asking about it now is asking a person who has been a customer
 * for four minutes to fill in a database.
 */
export function ProfileStep({ slug, done, onSaved }: ProfileStepProps) {
  const t = useT();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<{
    publicDisplayName: string;
    description: string;
    city: string;
    contactPhone: string;
  } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const organization = useQuery({
    queryKey: ['my-organization'],
    queryFn: getMyOrganization,
  });

  const mutation = useMutation({
    mutationFn: (input: NonNullable<typeof values> & { logoUrl?: string }) =>
      updateProfile(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      onSaved();
    },
    onError: () => setFailed(true),
  });

  if (organization.isPending) return <Skeleton className="h-96 w-full" />;

  const org = organization.data;
  /* The server's answer is the initial value, not the state: `useState` with
     a prop initialiser keeps whatever the first render saw, and this query
     resolves after that render. */
  const form = values ?? {
    publicDisplayName: org?.publicDisplayName ?? '',
    description: org?.description ?? '',
    city: org?.city ?? '',
    contactPhone: org?.contactPhone ?? '',
  };
  const photo = logoUrl ?? org?.logoUrl ?? null;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFailed(false);
    mutation.mutate({ ...form, ...(logoUrl ? { logoUrl } : {}) });
  }

  return (
    <StepShell
      title={t.onboarding.profileTitle}
      description={t.onboarding.profileText}
      done={done}
      doneLabel={t.onboarding.stepDone}
      footnote={t.onboarding.profileFootnote}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- an uploaded URL from our own bucket, sized by CSS
            <img
              src={photo}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl object-cover"
              width={80}
              height={80}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-bg-sunken text-2xl font-semibold text-ink-faint"
            >
              {(org?.name ?? '?').trim().charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm font-semibold text-ink-soft">{t.onboarding.profilePhoto}</p>
            <UploadDropzone
              target="page"
              hasImage={photo !== null}
              onUploaded={(url) => setLogoUrl(url)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="onboarding-name" className="text-sm font-semibold text-ink-soft">
            {t.pageSettings.displayName}
          </label>
          <Input
            id="onboarding-name"
            value={form.publicDisplayName}
            onChange={(event) => setValues({ ...form, publicDisplayName: event.target.value })}
            placeholder={org?.name}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="onboarding-about" className="text-sm font-semibold text-ink-soft">
            {t.onboarding.profileAbout}
          </label>
          <Textarea
            id="onboarding-about"
            value={form.description}
            onChange={(event) => setValues({ ...form, description: event.target.value })}
            placeholder={t.onboarding.profileAboutPlaceholder}
          />
          <span className="text-xs text-ink-faint">{t.onboarding.profileAboutHint}</span>
        </div>

        {/* Два столбца только когда столбцу есть куда встать: на телефоне
            колонка шириной в полторы сотни пикселей обрезала подсказку
            формата номера — «+371 20 000 000» в неё не входит. Ниже 640px
            поля идут стопкой. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="onboarding-city" className="text-sm font-semibold text-ink-soft">
              {t.pageSettings.city}
            </label>
            <Input
              id="onboarding-city"
              value={form.city}
              onChange={(event) => setValues({ ...form, city: event.target.value })}
              placeholder="Rīga"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="onboarding-phone" className="text-sm font-semibold text-ink-soft">
              {t.pageSettings.phone}
            </label>
            <Input
              id="onboarding-phone"
              type="tel"
              value={form.contactPhone}
              onChange={(event) => setValues({ ...form, contactPhone: event.target.value })}
              placeholder="+371 20 000 000"
            />
          </div>
        </div>

        {failed ? <FieldError>{t.common.actionFailed}</FieldError> : null}

        <div>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t.common.saving : t.onboarding.saveAndContinue}
          </Button>
        </div>
      </form>
    </StepShell>
  );
}
