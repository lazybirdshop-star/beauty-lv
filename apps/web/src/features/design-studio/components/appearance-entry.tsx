'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PaintBrushBroad } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardHint, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { formatDateTime } from '@/lib/format';
import { useLocale, useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';

import { getPageDesignState, rollbackPageDesign } from '../api';

import { HistorySheet } from './publish-sheet';

/**
 * Оформление в разделе «Страница мастера» после переезда в Студию
 * (DESIGN_STUDIO.md §7.5).
 *
 * Вкладка больше не редактор: анкета из карточек, селектов и полей-ссылок
 * заменена режимом, где правку видно на самой странице. Здесь остаётся ровно
 * то, что в режиме неуместно, — вход в него и **откат** (§7.3): «стало хуже»
 * замечают не у холста, а по звонкам клиентов, и путь назад обязан быть
 * коротким и находиться там, куда мастер придёт с этой мыслью.
 */
export function AppearanceEntry({ slug }: { slug: string }) {
  const t = useT();
  const locale = useLocale();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);

  const state = useQuery({
    queryKey: ['page-design', slug],
    queryFn: () => getPageDesignState(slug),
  });

  const rollback = useMutation({
    mutationFn: (version: number) => rollbackPageDesign(slug, version),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['page-design', slug] });
      void queryClient.invalidateQueries({ queryKey: ['my-organization'] });
      setHistoryOpen(false);
    },
    /* Откат — то, за чем приходят, когда клиенты уже звонят: неудача обязана
       быть сказана вслух, иначе закрывшийся лист истории читается как
       «вернули», а страница осталась прежней. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  if (state.isError) return <LoadError onRetry={() => void state.refetch()} />;
  if (state.isPending) return <Skeleton className="h-72 w-full" />;

  const { published, versions, hasDraft } = state.data;

  return (
    <div className="page-stack">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>{t.pageSettings.styleTitle}</CardTitle>
            <CardHint>{t.pageSettings.styleHint}</CardHint>
          </div>
        </CardHeader>

        <div className="appearance-entry">
          {/* Живой образ опубликованного, а не скриншот: тот же реестр, что
              рисует страницу клиенту. */}
          <div className="appearance-entry__thumb">
            <WorldThumbnail design={published} height={200} />
          </div>

          <div className="appearance-entry__body">
            <p className="appearance-entry__text">{t.studio.enterHint}</p>
            {hasDraft ? <p className="appearance-entry__draft">{t.studio.statusDraft}</p> : null}
            {/* «Открыть страницу» — в шапке экрана; здесь одно действие. */}
            <Button asChild variant="secondary" size="sm" className="appearance-entry__action">
              <Link href={`/${slug}/studio`}>
                <PaintBrushBroad size={16} />
                <span>{t.studio.enter}</span>
              </Link>
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.studio.history}</CardTitle>
        </CardHeader>

        {versions.length === 0 ? (
          <p className="appearance-entry__text">{t.studio.historyEmpty}</p>
        ) : (
          <div className="appearance-history">
            <p className="appearance-entry__text">
              {fmt(t.studio.historyVersion, { version: versions[0]!.version })} ·{' '}
              {formatDateTime(versions[0]!.publishedAt, locale)}
            </p>
            <Button variant="secondary" size="sm" onClick={() => setHistoryOpen(true)}>
              <Icon name="history" className="ico-18" />
              <span>{t.studio.history}</span>
            </Button>
          </div>
        )}
      </Card>

      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={versions}
        locale={locale}
        rollingBack={rollback.isPending ? rollback.variables : null}
        onRollback={(version) => rollback.mutate(version)}
      />
    </div>
  );
}
