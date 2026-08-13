'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowSquareOut, PaintBrushBroad } from '@phosphor-icons/react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadError } from '@/components/ui/load-error';
import { Skeleton } from '@/components/ui/skeleton';
import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { formatDateTime } from '@/lib/format';
import { fmt, useLocale, useT } from '@/lib/i18n';

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
  });

  if (state.isError) return <LoadError onRetry={() => void state.refetch()} />;
  if (state.isPending) return <Skeleton className="h-72 w-full" />;

  const { published, versions, hasDraft } = state.data;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.pageSettings.tabAppearance}</CardTitle>
        </CardHeader>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Живой образ опубликованного, а не скриншот: тот же реестр, что
              рисует страницу клиенту. */}
          <div className="w-full max-w-[220px] shrink-0">
            <WorldThumbnail design={published} height={200} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-sm leading-relaxed text-ink-soft">{t.studio.enterHint}</p>
            {hasDraft ? (
              <p className="rounded-xl bg-bg-sunken px-3 py-2 text-xs text-ink-soft">
                {t.studio.statusDraft}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href={`/${slug}/studio`}>
                  <PaintBrushBroad size={16} />
                  {t.studio.enter}
                </Link>
              </Button>
              <Button variant="secondary" asChild>
                <a href={`/${slug}`} target="_blank" rel="noreferrer">
                  <ArrowSquareOut size={16} />
                  {t.studio.openPage}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.studio.history}</CardTitle>
        </CardHeader>

        {versions.length === 0 ? (
          <p className="text-sm text-ink-soft">{t.studio.historyEmpty}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-soft">
              {fmt(t.studio.historyVersion, { version: versions[0]!.version })} ·{' '}
              {formatDateTime(versions[0]!.publishedAt, locale)}
            </p>
            <Button variant="secondary" onClick={() => setHistoryOpen(true)}>
              {t.studio.history}
            </Button>
          </div>
        )}
      </Card>

      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={versions}
        locale={locale}
        onRollback={(version) => rollback.mutate(version)}
      />
    </div>
  );
}
