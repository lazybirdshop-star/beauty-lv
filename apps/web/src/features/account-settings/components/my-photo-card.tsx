'use client';

/**
 * «Моё фото» в настройках — у любого участника, без права на оформление.
 *
 * Раньше лицо ставилось только в Студии, а Студия — за правом на страницу,
 * которого у наёмного мастера салона нет: у неё не было способа поставить
 * себе фотографию вовсе. Маршрут `members/me` охраняется только членством —
 * человек меняет своё лицо.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Skeleton } from '@/components/ui/skeleton';
import { clearMyAvatar, getMyAvatar, saveMyAvatar } from '@/features/design-studio/api';
import { revalidatePublicProfile } from '@/features/public-profile/engine/revalidate';
import { MemberPhotoCard } from '@/features/team/components/member-photo-card';
import { useT } from '@/lib/i18n';

export function MyPhotoCard({
  slug,
  memberId,
  name,
}: {
  slug: string;
  memberId: string;
  name: string;
}) {
  const t = useT();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ['member-avatar', slug],
    queryFn: () => getMyAvatar(slug),
  });

  if (query.isPending) return <Skeleton className="h-48 w-full" />;
  /* Не доехало — карточки нет: фото — дополнение к настройкам, и полоса
     ошибки над паролем значила бы больше, чем сама потеря. */
  if (query.isError) return null;

  return (
    <MemberPhotoCard
      title={t.team.myPhotoTitle}
      name={name}
      seed={memberId}
      initial={query.data.avatar}
      uploadTarget="avatar"
      save={async (media) => {
        const result = media ? await saveMyAvatar(slug, media) : await clearMyAvatar(slug);
        await Promise.all([
          cache.invalidateQueries({ queryKey: ['member-avatar', slug] }),
          cache.invalidateQueries({ queryKey: ['team', slug] }),
          revalidatePublicProfile(slug),
        ]);
        return result;
      }}
    />
  );
}
