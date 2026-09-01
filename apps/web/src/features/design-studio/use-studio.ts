'use client';

import { pageDesignEquals, type PageDesign } from '@amolie/shared-kernel';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { revalidatePublicProfile } from '@/features/public-profile/engine/revalidate';

import {
  discardPageDesignDraft,
  publishPageDesign,
  rollbackPageDesign,
  savePageDesignDraft,
  type PageDesignState,
} from './api';

/** Глубина стека отмены (DESIGN_STUDIO.md §7.3): каждая зафиксированная правка. */
const HISTORY_DEPTH = 50;

/** Пауза после последней правки перед автосохранением черновика (§7.1). */
const AUTOSAVE_DELAY_MS = 900;

/**
 * Статус черновика — то, что верхняя панель обязана говорить честно и всегда
 * (§3.1, §7.1). Состояний ровно столько, сколько их бывает на самом деле.
 */
export type StudioStatus = 'published' | 'saving' | 'saved' | 'draft' | 'offline' | 'error';

export interface StudioController {
  /** Зафиксированные решения мастера — то, что уедет в публикацию. */
  design: PageDesign;
  /** Что показывает холст: примерка по наведению или подгляд сильнее черновика. */
  preview: PageDesign;
  published: PageDesign;
  versions: PageDesignState['versions'];
  archived: boolean;

  set: (next: PageDesign) => void;
  /** Примерка варианта без фиксации; `null` возвращает выбранное (§3.3). */
  tryOn: (next: PageDesign | null) => void;
  /** Подгляд опубликованного: удержание кнопки-глаза. */
  setPeeking: (peeking: boolean) => void;
  peeking: boolean;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  status: StudioStatus;
  isDirty: boolean;
  isPublishing: boolean;
  online: boolean;

  publish: () => Promise<void>;
  revert: () => Promise<void>;
  rollback: (version: number) => Promise<void>;
}

/**
 * Состояние режима Студии: черновик, история правок, автосохранение и
 * публикация.
 *
 * Хук держит **всё** состояние режима, и это осознанно: инспектор, панель и
 * холст — три вида на один черновик, и разложить его по трём компонентам
 * значит завести три источника истины на один вопрос «что сейчас видит
 * мастер». Компоненты остаются разметкой.
 *
 * Потерять работу из-за метро нельзя (§8): офлайн черновик продолжает
 * принимать правки локально, автосохранение ждёт сети, а публикация честно
 * недоступна — но черновик при этом не трогается ни на байт.
 */
export function useStudio(slug: string, initial: PageDesignState): StudioController {
  const [published, setPublished] = useState(initial.published);
  const [versions, setVersions] = useState(initial.versions);
  const [archived, setArchived] = useState(initial.archived);

  /* История как стек снимков, а не операций: правки Студии независимы и
     мелкие, и снимок решений весит меньше, чем машина обратных операций,
     которую пришлось бы держать в согласии с каждой новой ручкой. */
  const [history, setHistory] = useState<PageDesign[]>([initial.draft]);
  const [cursor, setCursor] = useState(0);

  const [tryOnDesign, setTryOnDesign] = useState<PageDesign | null>(null);
  const [peeking, setPeeking] = useState(false);
  const [status, setStatus] = useState<StudioStatus>(initial.hasDraft ? 'draft' : 'published');
  const [isPublishing, setPublishing] = useState(false);
  const online = useOnline();

  const design = history[cursor] ?? initial.draft;
  const isDirty = useMemo(() => !pageDesignEquals(design, published), [design, published]);

  /* Что показывает холст. Порядок сильнее всего: подгляд опубликованного
     побеждает примерку, примерка — черновик. */
  const preview = peeking ? published : (tryOnDesign ?? design);

  /* ── Автосохранение ────────────────────────────────────────────────── */

  const pendingSave = useRef<PageDesign | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  /* Пауза заводится и из `scheduleSave`, и из самого `flush`; ссылка держит
     последнюю версию функции, чтобы таймер не позвал вчерашнее замыкание. */
  const flushRef = useRef<() => void>(() => {});

  const arm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), AUTOSAVE_DELAY_MS);
  }, []);

  const flush = useCallback(async () => {
    const payload = pendingSave.current;
    if (!payload || !navigator.onLine) return;

    /* Один черновик в полёте за раз: возвращение сети и сработавшая пауза
       могут прийтись на один момент, и без этой проверки один и тот же
       черновик уехал бы дважды. Тому, что упёрлось сюда, паузу заведёт
       заново `finally` этого же запроса. */
    if (inFlight.current) return;

    inFlight.current = true;
    pendingSave.current = null;
    setStatus('saving');
    let saved = false;
    try {
      const next = await savePageDesignDraft(slug, payload);
      setPublished(next.published);
      setArchived(next.archived);
      /* Сервер мог поправить решение (§7.4) — но переписывать им черновик
         под руками мастера нельзя: она продолжает править, и подмена
         состояния на полпути читается как потеря ввода. Расхождение
         показывает холст при следующем кадре. */
      setStatus(next.hasDraft ? 'saved' : 'published');
      saved = true;
    } catch {
      /* Черновик остаётся в памяти и уедет со следующей правкой или
         возвращением сети: сказать правду важнее, чем сделать вид. */
      pendingSave.current = payload;
      setStatus('error');
    } finally {
      inFlight.current = false;
      /*
       * Пока запрос был в полёте, мастер могла править дальше — и эта правка
       * не уезжала вовсе: её пауза сработала, упёрлась в `inFlight` и ушла ни
       * с чем, а новую никто не заводил. Черновик ждал следующей правки,
       * которой могло не случиться, — а панель показывала «Сохранено». Тихая
       * потеря работы, о которой сообщали словом «сохранено».
       *
       * Новая пауза только после удачи: заводить её после отказа значит
       * превратить автосохранение в бесконечный повтор к молчащему серверу.
       * Отказ ждёт следующей правки или возвращения сети — как и обещает
       * ветка `catch`.
       */
      if (saved && pendingSave.current) arm();
    }
  }, [arm, slug]);

  useEffect(() => {
    flushRef.current = () => void flush();
  }, [flush]);

  const scheduleSave = useCallback(
    (next: PageDesign) => {
      pendingSave.current = next;
      arm();
    },
    [arm],
  );

  /* Вернулась сеть — черновик уезжает сам, без единого действия мастера. */
  useEffect(() => {
    if (online && pendingSave.current) void flush();
  }, [online, flush]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  /* ── Правки ────────────────────────────────────────────────────────── */

  /*
   * Правка считается снаружи обновляющей функции, а не внутри неё.
   *
   * Прежняя версия звала `setCursor` и `scheduleSave` из тела `setHistory`, а
   * обновляющая функция обязана быть чистой: React волен вызвать её дважды
   * (в StrictMode вызывает всегда), и тогда один шаг мастера ставил курсор и
   * заводил автосохранение по два раза. Здесь новый стек и его курсор
   * вычисляются один раз, из значений, которые уже есть.
   */
  const commit = useCallback(
    (next: PageDesign) => {
      const trimmed = [...history.slice(0, cursor + 1), next];
      /* Стек сессии глубиной 50 шагов: старшее уезжает, курсор следует. */
      const overflow = Math.max(0, trimmed.length - HISTORY_DEPTH);
      setHistory(overflow > 0 ? trimmed.slice(overflow) : trimmed);
      setCursor(trimmed.length - 1 - overflow);
      setStatus('draft');
      scheduleSave(next);
    },
    [cursor, history, scheduleSave],
  );

  const set = useCallback(
    (next: PageDesign) => {
      if (pageDesignEquals(next, design)) return;
      commit(next);
    },
    [commit, design],
  );

  const step = useCallback(
    (delta: number) => {
      const next = Math.min(history.length - 1, Math.max(0, cursor + delta));
      const target = history[next];
      if (!target || next === cursor) return;
      setCursor(next);
      setStatus('draft');
      scheduleSave(target);
    },
    [cursor, history, scheduleSave],
  );

  /* ── Публикация и откаты ───────────────────────────────────────────── */

  const applyState = useCallback((next: PageDesignState) => {
    setPublished(next.published);
    setVersions(next.versions);
    setArchived(next.archived);
    setHistory([next.draft]);
    setCursor(0);
    setStatus(next.hasDraft ? 'draft' : 'published');
  }, []);

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      /* Черновик уезжает целиком перед публикацией: между последней правкой
         и нажатием могло не пройти времени автосохранения, и публиковать
         серверный черновик в этот момент значило бы опубликовать вчерашнее. */
      if (timer.current) clearTimeout(timer.current);
      pendingSave.current = null;
      applyState(await publishPageDesign(slug, design));
      /* Публичная страница помнит витрину до пяти минут. Мастер, нажавшая
         «Опубликовать», идёт смотреть её сейчас — и без этой строки увидела бы
         прежнюю. Не в `finally`: гасить кэш после неудачной публикации значит
         выбрасывать верную копию из-за чужой ошибки. */
      await revalidatePublicProfile(slug);
    } catch (error) {
      setStatus('error');
      throw error;
    } finally {
      setPublishing(false);
    }
  }, [applyState, design, slug]);

  const revert = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    pendingSave.current = null;
    applyState(await discardPageDesignDraft(slug));
  }, [applyState, slug]);

  const rollback = useCallback(
    async (version: number) => {
      applyState(await rollbackPageDesign(slug, version));
      await revalidatePublicProfile(slug);
    },
    [applyState, slug],
  );

  return {
    design,
    preview,
    published,
    versions,
    archived,
    set,
    tryOn: setTryOnDesign,
    setPeeking,
    peeking,
    undo: () => step(-1),
    redo: () => step(1),
    canUndo: cursor > 0,
    canRedo: cursor < history.length - 1,
    status: online ? status : 'offline',
    isDirty,
    isPublishing,
    online,
    publish,
    revert,
    rollback,
  };
}

/** Сеть как состояние продукта, а не как случайность запроса (§8). */
function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return online;
}
