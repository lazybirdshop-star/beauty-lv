'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/toast';
import { PublicAddressEditor } from '@/features/public-address/components/public-address-editor';
import { useT } from '@/lib/i18n';

import { StepShell } from '../step-shell';

interface AddressStepProps {
  slug: string;
  done: boolean;
  /** Шаг закрыт — можно переворачивать страницу. */
  onChosen: () => void;
}

/**
 * Step one, and first for a reason: everything after it — the page, the price
 * list, the link she sends — hangs off this address, and the master has been
 * carrying an auto-generated one since the moment she registered.
 */
export function AddressStep({ slug, done, onChosen }: AddressStepProps) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  return (
    <StepShell
      title={t.onboarding.addressTitle}
      description={t.onboarding.addressText}
      done={done}
      doneLabel={t.onboarding.stepDone}
      footnote={t.onboarding.addressFootnote}
    >
      <PublicAddressEditor
        slug={slug}
        submitLabel={t.address.save}
        /* «Оставляю этот». Адрес у мастера есть с регистрации, собранный из
           имени, и до сих пор шаг закрывался только переименованием — тот, кого
           свой адрес устраивал, не мог закрыть его вовсе, и деление на рельсе
           так и оставалось незакрашенным. */
        onKept={() => {
          void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
          toast({ message: t.address.kept });
          onChosen();
        }}
        onChanged={(nextSlug) => {
          /* The wizard itself lives under the old address. Move it, keep the
             master on the same step, and drop every cache keyed by the slug
             she just left. */
          queryClient.clear();
          toast({ message: t.address.changed });
          router.replace(`/${nextSlug}/dashboard/start?step=address`);
          router.refresh();
        }}
      />
    </StepShell>
  );
}
