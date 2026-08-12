'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/lib/i18n';

import { PublicAddressEditor } from './public-address-editor';

/**
 * The address editor where a master goes looking for it: beside everything
 * else her clients see.
 *
 * Owns the one consequence the editor cannot own — the panel itself lives
 * under `/{slug}`, so changing the address means this very page's URL is now
 * the old one. Replacing rather than pushing: the previous URL is dead, and
 * leaving it on the history stack turns the browser's back button into a
 * redirect loop through a page that no longer exists.
 */
export function PublicAddressCard({ slug }: { slug: string }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.address.title}</CardTitle>
      </CardHeader>
      <p className="-mt-2 mb-4 text-xs text-ink-faint">{t.address.cardHint}</p>

      <PublicAddressEditor
        slug={slug}
        onChanged={(nextSlug) => {
          /* Every cached answer here is keyed by the old address; leaving them
             behind would show the new page the previous page's data. */
          queryClient.clear();
          toast({ message: t.address.changed });
          router.replace(`/${nextSlug}/dashboard/profile-page`);
          router.refresh();
        }}
      />
    </Card>
  );
}
