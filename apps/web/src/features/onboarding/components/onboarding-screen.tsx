'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { LoadError } from '@/components/ui/load-error';
import { Icon } from '@/features/dashboard-shell/components/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';

import { completeOnboarding, getOnboardingStatus } from '../api';
import { isOnboardingStep, ONBOARDING_STEPS, type OnboardingStepKey } from '../types';
import { ProgressRail } from './progress-rail';
import { AddressStep } from './steps/address-step';
import { DesignStep } from './steps/design-step';
import { ProfileStep } from './steps/profile-step';
import { ScheduleStep } from './steps/schedule-step';
import { ServicesStep } from './steps/services-step';
import { ShareStep } from './steps/share-step';

function stepLabel(t: Messages, key: OnboardingStepKey): string {
  switch (key) {
    case 'address':
      return t.onboarding.addressShort;
    case 'profile':
      return t.onboarding.profileShort;
    case 'design':
      return t.onboarding.designShort;
    case 'services':
      return t.onboarding.servicesShort;
    case 'schedule':
      return t.onboarding.scheduleShort;
    case 'share':
      return t.onboarding.shareShort;
  }
}

/**
 * Guided setup, in the panel's own shell.
 *
 * Deliberately *not* a modal takeover: a master who wants to look at her
 * calendar mid-setup should be one tap away, and a flow nobody can leave is a
 * flow people abandon by closing the tab. Nothing here is mandatory — the
 * steps stay open, out of order, and «позже» is a real answer.
 *
 * Progress is never held in this component. Every step's done-ness is a fact
 * on the server (a service exists, a window is published), so finishing a step
 * means invalidating the query and letting the truth come back.
 */
export function OnboardingScreen({ slug }: { slug: string }) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const status = useQuery({
    queryKey: ['onboarding'],
    queryFn: getOnboardingStatus,
  });

  /* The step in the URL survives the one navigation this flow performs on its
     own: changing the address moves the panel to `/{newSlug}/dashboard/start`,
     and landing back on step one would read as the change having failed. */
  const requested = searchParams.get('step');
  const [index, setIndex] = useState<number | null>(
    isOnboardingStep(requested) ? ONBOARDING_STEPS.indexOf(requested) : null,
  );

  const complete = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      router.push(`/${slug}/dashboard`);
    },
    /* Последнее нажатие знакомства: молчание здесь оставляет человека на
       шаге, который он только что закончил, без единого слова о том,
       почему. */
    onError: (error) => toast({ message: describeApiError(error, t), tone: 'danger' }),
  });

  if (status.isError) return <LoadError onRetry={() => void status.refetch()} />;
  if (status.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const steps = status.data.steps;
  /* Where she has not been yet, until she says otherwise — a returning master
     lands on her first unfinished step rather than at the beginning. */
  const fallbackIndex = Math.max(
    0,
    steps.findIndex((step) => !step.done && !step.optional),
  );
  const currentIndex = Math.min(index ?? fallbackIndex, steps.length - 1);
  const current = steps[currentIndex]!;
  const allRequiredDone = status.data.nextStep === null;

  function refreshStatus() {
    void queryClient.invalidateQueries({ queryKey: ['onboarding'] });
  }

  function goTo(next: number) {
    setIndex(Math.min(Math.max(next, 0), steps.length - 1));
    /* The flow is a column, not a page — scrolling back to the top is what
       "turning the page" means here. */
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="onboarding-column">
      <header className="col" style={{ gap: 14 }}>
        {/* Счётчик один. Их было два — «Шаг 1 из 6» слева и «0 из 6» справа, —
            и в одинаковой форме «N из 6» они читались как одно и то же число,
            разошедшееся само с собой. Где мастер находится, говорит эта
            строка; сколько сделано — рельса под ней, закрашенными делениями. */}
        <span className="t-meta" style={{ fontSize: 13, fontWeight: 500 }}>
          {fmt(t.onboarding.stepOf, { current: currentIndex + 1, total: steps.length })}
        </span>

        <ProgressRail
          steps={steps.map((step) => ({
            key: step.key,
            label: stepLabel(t, step.key),
            done: step.done,
          }))}
          currentIndex={currentIndex}
          onSelect={goTo}
        />
      </header>

      {current.key === 'address' ? (
        <AddressStep slug={slug} done={current.done} onChosen={() => goTo(currentIndex + 1)} />
      ) : current.key === 'profile' ? (
        <ProfileStep slug={slug} done={current.done} onSaved={() => goTo(currentIndex + 1)} />
      ) : current.key === 'design' ? (
        <DesignStep slug={slug} done={current.done} />
      ) : current.key === 'services' ? (
        <ServicesStep slug={slug} done={current.done} onCreated={refreshStatus} />
      ) : current.key === 'schedule' ? (
        <ScheduleStep slug={slug} done={current.done} onPublished={refreshStatus} />
      ) : (
        <ShareStep slug={slug} done={current.done} />
      )}

      <nav className="row" style={{ justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-ghost btn-lg"
          onClick={() => goTo(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <Icon name="arrowL" className="ico-18" />
          <span>{t.onboarding.back}</span>
        </button>

        <div className="row" style={{ gap: 8 }}>
          {/* «Позже» уходит, ничего не отмечая законченным: список дел на
              главной — нить обратно, и притвориться, что она всё закончила,
              значит эту нить оборвать. */}
          <Link className="btn btn-ghost btn-lg" href={`/${slug}/dashboard`}>
            <span>{t.onboarding.later}</span>
          </Link>

          {currentIndex === steps.length - 1 || (allRequiredDone && current.done) ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => complete.mutate()}
              disabled={complete.isPending}
            >
              <span>{complete.isPending ? t.common.processing : t.onboarding.finish}</span>
            </button>
          ) : (
            /* Одна кнопка и одно слово. Раньше на незаконченном шаге здесь
               стояло «Пропустить» — но кнопка на этом месте делает ровно одно:
               переворачивает страницу. Мастер, которая ещё вернётся к этому
               шагу, всё равно листает дальше, и называть это пропуском значит
               обещать ей, что шага больше не будет. */
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => goTo(currentIndex + 1)}
            >
              <span>{t.onboarding.continueStep}</span>
              <Icon name="arrowR" className="ico-18" />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
