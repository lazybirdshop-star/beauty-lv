'use client';

import {
  ArrowArcLeft,
  ArrowArcRight,
  ArrowLeft,
  ArrowSquareOut,
  ClockCounterClockwise,
  DeviceMobile,
  Eye,
  Monitor,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmSheet } from '@/components/ui/confirm-sheet';
import { useToast } from '@/components/ui/toast';
import { describeApiError } from '@/lib/describe-api-error';
import type { OrganizationProfile } from '@/features/organization-profile/types';
import { useLocale, useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { PageDesignState } from '../api';
import type { PreviewContext, PreviewEmulation, StudioZone } from '../preview-bridge';
import { useStudio, type StudioStatus } from '../use-studio';

import { StyleGallery } from './gallery';
import { Inspector, ZONE_TO_SECTION, type StudioSection } from './inspector';
import { PublishSheet, HistorySheet } from './publish-sheet';
import { StudioCanvas, type StudioDevice } from './studio-canvas';

const STATUS_LABEL: Record<StudioStatus, keyof ReturnType<typeof useT>['studio']> = {
  published: 'statusPublished',
  saving: 'statusSaving',
  saved: 'statusSaved',
  draft: 'statusDraft',
  offline: 'statusOffline',
  error: 'statusError',
};

/**
 * Студия — режим, а не вкладка (DESIGN_STUDIO.md §1): экран целиком отдаётся
 * странице и её облику, выход возвращает в кабинет.
 *
 * Компоновка мобильная первой (§3.4): холст занимает верх, инспектор живёт
 * снизу и складывается до ручки; с планшета инспектор уезжает в боковую
 * колонку 360px, а холст получает остаток. Десктоп получает больше места, не
 * больше сущностей.
 *
 * Всё состояние держит `useStudio`: панель, инспектор и холст — три вида на
 * один черновик, и этот компонент остаётся разметкой.
 */
export function StudioScreen({
  org,
  slug,
  initial,
  exitHref,
}: {
  org: OrganizationProfile;
  slug: string;
  initial: PageDesignState;
  /** Куда ведёт выход — туда, откуда мастер сюда пришла. */
  exitHref: string;
}) {
  const t = useT();
  const toast = useToast();
  const locale = useLocale();
  const studio = useStudio(slug, initial);

  const [device, setDevice] = useState<StudioDevice>('phone');
  const [context, setContext] = useState<PreviewContext>('page');
  const [emulation, setEmulation] = useState<PreviewEmulation>({
    reducedMotion: false,
    reducedTransparency: false,
  });
  const [openSection, setOpenSection] = useState<StudioSection | null>('style');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [revertOpen, setRevertOpen] = useState(false);
  const [publishError, setPublishError] = useState(false);
  /*
   * Откат и возврат к опубликованному — такие же запросы, как публикация, но
   * жили без единого признака полёта и без ветки отказа: `void promise.then()`
   * молча терял отклонение, лист оставался открытым, кнопка не менялась. На
   * телефоне в лифте это неотличимо от промаха мимо кнопки.
   */
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [reverting, setReverting] = useState(false);
  /* Галерея — первый экран для страницы, ещё не переехавшей в Студию (§8). */
  const [galleryOpen, setGalleryOpen] = useState(initial.archived);

  const onZone = useCallback((zone: StudioZone) => {
    setOpenSection(ZONE_TO_SECTION[zone]);
    setInspectorOpen(true);
  }, []);

  if (galleryOpen) {
    return (
      <StyleGallery
        design={studio.design}
        archived={studio.archived}
        onChoose={(design) => {
          studio.set(design);
          setGalleryOpen(false);
        }}
        onSkip={() => setGalleryOpen(false)}
      />
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-bg">
      {/* ── Верхняя панель (§3.1) ───────────────────────────────────────
          Тот же хром, что у кабинета: поле `bg`, волосяная линия снизу,
          16 в высоту и поля 20px — панель Студии обязана читаться
          продолжением верхней панели, из которой мастер сюда вошла. */}
      <header className="flex min-h-16 shrink-0 items-center gap-2 border-b border-border bg-bg px-4 py-3 lg:px-6">
        <Button variant="secondary" size="sm" asChild>
          <Link href={exitHref}>
            <ArrowLeft size={16} />
            <span className="sr-only sm:not-sr-only">{t.studio.exit}</span>
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg leading-none text-ink">{org.name}</p>
          <p className="mt-1.5 truncate text-xs text-ink-faint">/{slug}</p>
        </div>

        {/* Отмена и повтор — стек сессии; на телефоне уезжают в «ещё». */}
        <div className="hidden items-center gap-1 sm:flex">
          <IconButton
            label={t.studio.undo}
            disabled={!studio.canUndo}
            onClick={studio.undo}
            icon={<ArrowArcLeft size={18} />}
          />
          <IconButton
            label={t.studio.redo}
            disabled={!studio.canRedo}
            onClick={studio.redo}
            icon={<ArrowArcRight size={18} />}
          />
        </div>

        {/* Переключатель устройства: телефон по умолчанию — другого у клиентов
            мастера в руках нет (§3.1). */}
        <div className="hidden gap-1 rounded-full bg-bg-sunken p-1 sm:flex">
          {(
            [
              { key: 'phone', icon: DeviceMobile, label: t.studio.devicePhone },
              { key: 'desktop', icon: Monitor, label: t.studio.deviceDesktop },
            ] as const
          ).map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={device === option.key}
              aria-label={option.label}
              onClick={() => setDevice(option.key)}
              className={cn(
                'press inline-flex h-9 w-11 cursor-pointer items-center justify-center rounded-full',
                device === option.key ? 'bg-bg-raised text-ink' : 'text-ink-faint',
              )}
            >
              <option.icon size={18} />
            </button>
          ))}
        </div>

        {/* Подгляд опубликованного: удержание, а не переключатель (§3.3). */}
        <button
          type="button"
          aria-label={t.studio.peek}
          onPointerDown={() => studio.setPeeking(true)}
          onPointerUp={() => studio.setPeeking(false)}
          onPointerLeave={() => studio.setPeeking(false)}
          onBlur={() => studio.setPeeking(false)}
          /* Удержание отмечено поверхностью, а не розовым: акцент в кабинете
             не красит ни текст, ни иконки — у него ровно две роли (§2.0). */
          className={cn(
            'press hidden h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-soft sm:inline-flex',
            studio.peeking && 'bg-bg-sunken text-ink',
          )}
        >
          <Eye size={18} weight={studio.peeking ? 'fill' : 'regular'} />
        </button>

        <IconButton
          label={t.studio.history}
          onClick={() => setHistoryOpen(true)}
          icon={<ClockCounterClockwise size={18} />}
        />

        <span className="hidden max-w-[22ch] truncate text-xs text-ink-faint md:inline">
          {t.studio[STATUS_LABEL[studio.status]]}
        </span>

        {/* Не тронутый черновик — не повод запирать публикацию.

            Страница, ещё не переехавшая в Студию, живёт на облике по
            умолчанию, и настройка считает шаг сделанным ровно по факту
            публикации. Мастер, которой нынешний вид нравится, оказывалась
            в тупике: кнопка серая, объяснения нет, а шаг не закрывается.
            Пока страница не переехала, публикация доступна и без правок —
            это и есть решение «оставляю как есть». */}
        <Button
          size="sm"
          disabled={(!studio.isDirty && !studio.archived) || studio.isPublishing || !studio.online}
          onClick={() => {
            setPublishError(false);
            setPublishOpen(true);
          }}
        >
          {t.studio.publish}
        </Button>
      </header>

      {/* ── Холст + инспектор ──────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row-reverse">
        <main className="min-h-0 flex-1 overflow-hidden">
          <StudioCanvas
            slug={slug}
            design={studio.preview}
            device={device}
            context={context}
            emulation={emulation}
            onZone={onZone}
          />
        </main>

        <aside
          className={cn(
            'flex shrink-0 flex-col border-t border-border bg-bg-raised lg:w-[360px] lg:border-r lg:border-t-0',
            /* Свайп вниз складывает шторку до ручки, открывая страницу
               целиком (§3.4). На широком экране инспектор — колонка и не
               складывается: там места хватает обоим. */
            inspectorOpen ? 'max-h-[52dvh] lg:max-h-none' : 'max-h-14 lg:max-h-none',
          )}
        >
          <button
            type="button"
            onClick={() => setInspectorOpen((open) => !open)}
            aria-expanded={inspectorOpen}
            className="press flex min-h-12 shrink-0 cursor-pointer items-center justify-between px-5 lg:hidden"
          >
            <span className="text-[15px] text-ink">{t.studio.inspector}</span>
            <span className="text-xs text-ink-faint">
              {inspectorOpen ? t.studio.collapseInspector : t.studio.expandInspector}
            </span>
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <ContextBar
              context={context}
              onContext={setContext}
              emulation={emulation}
              onEmulation={setEmulation}
            />

            <Inspector
              design={studio.design}
              published={studio.published}
              masterName={org.publicDisplayName?.trim() || org.name}
              openSection={openSection}
              onOpenSection={setOpenSection}
              onChange={studio.set}
              onPreview={studio.tryOn}
            />

            <div className="mt-4 flex flex-col gap-2">
              {studio.isDirty ? (
                <Button variant="secondary" onClick={() => setRevertOpen(true)}>
                  {t.studio.revert}
                </Button>
              ) : null}
              <Button variant="secondary" asChild>
                <a href={`/${slug}`} target="_blank" rel="noreferrer">
                  <ArrowSquareOut size={16} />
                  {t.studio.openPage}
                </a>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <PublishSheet
        open={publishOpen}
        onOpenChange={setPublishOpen}
        published={studio.published}
        draft={studio.design}
        publishing={studio.isPublishing}
        error={publishError}
        archived={studio.archived}
        onConfirm={() => {
          void studio
            .publish()
            .then(() => setPublishOpen(false))
            .catch(() => setPublishError(true));
        }}
      />

      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={studio.versions}
        locale={locale}
        rollingBack={rollingBack}
        onRollback={(version) => {
          setRollingBack(version);
          void studio
            .rollback(version)
            .then(() => setHistoryOpen(false))
            .catch((error: unknown) =>
              toast({ message: describeApiError(error, t), tone: 'danger' }),
            )
            .finally(() => setRollingBack(null));
        }}
      />

      <ConfirmSheet
        open={revertOpen}
        onOpenChange={setRevertOpen}
        title={t.studio.revertTitle}
        description={t.studio.revertText}
        confirmLabel={t.studio.revert}
        loading={reverting}
        onConfirm={() => {
          setReverting(true);
          void studio
            .revert()
            .then(() => setRevertOpen(false))
            .catch((error: unknown) =>
              toast({ message: describeApiError(error, t), tone: 'danger' }),
            )
            .finally(() => setReverting(false));
        }}
      />
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="press inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-soft disabled:cursor-default disabled:text-ink-faint/50"
    >
      {icon}
    </button>
  );
}

/**
 * Контексты и эмуляция (§4.4): мастер проверяет не «дизайн вообще», а каждый
 * экран, который получит её клиент, — и то, как его увидят клиенты с
 * системными настройками доступности.
 */
function ContextBar({
  context,
  onContext,
  emulation,
  onEmulation,
}: {
  context: PreviewContext;
  onContext: (context: PreviewContext) => void;
  emulation: PreviewEmulation;
  onEmulation: (emulation: PreviewEmulation) => void;
}) {
  const t = useT();
  const contexts = [
    { key: 'page' as const, label: t.studio.contextPage },
    { key: 'booking' as const, label: t.studio.contextBooking },
    { key: 'status' as const, label: t.studio.contextStatus },
  ];

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex gap-1 rounded-full bg-bg-sunken p-1">
        {contexts.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={context === item.key}
            onClick={() => onContext(item.key)}
            className={cn(
              'press min-h-9 flex-1 cursor-pointer rounded-full px-2 text-xs',
              context === item.key ? 'bg-bg-raised text-ink' : 'text-ink-faint',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <EmulationChip
          label={t.studio.emulateReducedMotion}
          active={emulation.reducedMotion}
          onToggle={() => onEmulation({ ...emulation, reducedMotion: !emulation.reducedMotion })}
        />
        <EmulationChip
          label={t.studio.emulateReducedTransparency}
          active={emulation.reducedTransparency}
          onToggle={() =>
            onEmulation({ ...emulation, reducedTransparency: !emulation.reducedTransparency })
          }
        />
      </div>
    </div>
  );
}

function EmulationChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      /* Включённая эмуляция — залитая пилюля чернилами, а не розовая
         подложка: розовый в кабинете заливает только кнопку записи. */
      className={cn(
        'press min-h-9 cursor-pointer rounded-full px-3 text-[11px]',
        active ? 'bg-ink text-bg' : 'bg-bg-sunken text-ink-soft',
      )}
    >
      {label}
    </button>
  );
}
