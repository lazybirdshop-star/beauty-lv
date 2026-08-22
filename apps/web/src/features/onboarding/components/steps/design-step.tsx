'use client';

import { PaintBrushBroad } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getPageDesignState } from '@/features/design-studio/api';
import { WorldThumbnail } from '@/features/public-profile/registry/world-thumbnail';
import { useT } from '@/lib/i18n';

import { StepShell } from '../step-shell';

interface DesignStepProps {
  slug: string;
  done: boolean;
}

/**
 * Appearance, and the one step that deliberately sends the master somewhere
 * else.
 *
 * The Studio is a full-screen mode where an edit is visible on the page
 * itself — a set of swatches embedded in this card would be a worse version
 * of a tool that already exists, and the two would drift apart on the first
 * change to either. What belongs here is the invitation, a live image of what
 * her page looks like right now, and the truth that she already has a design
 * and is about to make it hers.
 */
export function DesignStep({ slug, done }: DesignStepProps) {
  const t = useT();

  const state = useQuery({
    queryKey: ['page-design', slug],
    queryFn: () => getPageDesignState(slug),
  });

  return (
    <StepShell
      title={t.onboarding.designTitle}
      description={t.onboarding.designText}
      done={done}
      doneLabel={t.onboarding.stepDone}
      footnote={t.onboarding.designFootnote}
    >
      {/* На узком экране блок стоит колонкой, и колонка выровнена по центру:
          снимок страницы здесь — предмет, вокруг которого всё и построено, а
          строка и две кнопки, прижатые к левому краю под центрованным
          снимком, читались как обломок соседней раскладки. С планшета всё
          возвращается в ряд, и выключка снова левая. */}
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="w-full max-w-[220px] shrink-0">
          {state.isPending ? (
            <Skeleton className="h-[200px] w-full" />
          ) : state.data ? (
            /* The real registry that renders her page, not a screenshot — a
               preview that can go stale is a preview that will. */
            <WorldThumbnail design={state.data.published} height={200} />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
          <p className="text-sm leading-relaxed text-ink-soft">{t.onboarding.designHint}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button asChild>
              {/* Обратный адрес едет с переходом: Студия — отдельный режим во
                  весь экран, и без него выход из неё вёл в «Страницу мастера»,
                  а к шести шагам нельзя было вернуться иначе как кнопкой
                  «назад» в самом браузере. */}
              <Link href={`/${slug}/studio?return=onboarding`}>
                <PaintBrushBroad size={16} />
                {t.studio.enter}
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <a href={`/${slug}`} target="_blank" rel="noreferrer">
                {t.studio.openPage}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </StepShell>
  );
}
