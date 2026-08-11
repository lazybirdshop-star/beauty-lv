// @vitest-environment jsdom

import { defaultPageDesign, type PageDesign } from '@amolie/shared-kernel';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageDesignState } from './api';
import { useStudio } from './use-studio';

/**
 * Состояние режима Студии (DESIGN_STUDIO.md §7): черновик, история правок,
 * автосохранение и публикация.
 *
 * Проверяется то, что мастер теряет молча, если оно сломается: отличие
 * черновика от опубликованного, стек отмены, пауза автосохранения, поведение
 * в офлайне и порядок «что показывает холст».
 */

const saveDraft = vi.fn();
const publish = vi.fn();
const discardDraft = vi.fn();
const rollback = vi.fn();

vi.mock('./api', () => ({
  savePageDesignDraft: (...args: unknown[]) => saveDraft(...args),
  publishPageDesign: (...args: unknown[]) => publish(...args),
  discardPageDesignDraft: (...args: unknown[]) => discardDraft(...args),
  rollbackPageDesign: (...args: unknown[]) => rollback(...args),
}));

function makeState(overrides: Partial<PageDesignState> = {}): PageDesignState {
  const published = defaultPageDesign('soft-studio');
  return {
    published,
    draft: published,
    hasDraft: false,
    archived: false,
    versions: [],
    ...overrides,
  };
}

function withAccent(design: PageDesign, accent: string): PageDesign {
  return { ...design, accent };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  saveDraft.mockReset().mockImplementation(async () => makeState({ hasDraft: true }));
  publish.mockReset().mockImplementation(async () => makeState());
  discardDraft.mockReset().mockImplementation(async () => makeState());
  rollback.mockReset().mockImplementation(async () => makeState());
});

afterEach(() => {
  /* Размонтирование обязательно: хук слушает `online`/`offline` на окне, и
     переживший тест экземпляр отвечал бы на событие следующего — счёт
     сохранений тогда считает не тот хук, который проверяют. Автоочистки в
     этом проекте нет (setup-файла у vitest нет), поэтому она здесь явная. */
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useStudio', () => {
  it('starts clean and turns dirty on the first real change', () => {
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    expect(result.current.isDirty).toBe(false);
    expect(result.current.status).toBe('published');

    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));

    expect(result.current.isDirty).toBe(true);
    expect(result.current.status).toBe('draft');
  });

  it('ignores a change that changes nothing', () => {
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => result.current.set({ ...initial.draft }));

    expect(result.current.isDirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
  });

  it('walks the session stack back and forward', () => {
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));
    act(() => result.current.set(withAccent(initial.draft, '#2F5D8C')));

    expect(result.current.design.accent).toBe('#2F5D8C');
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.design.accent).toBe('#8C4A2F');

    act(() => result.current.undo());
    expect(result.current.design.accent).toBeNull();
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(result.current.design.accent).toBe('#8C4A2F');
  });

  it('drops the redo branch once a new edit lands on top of an undo', () => {
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));
    act(() => result.current.undo());
    act(() => result.current.set(withAccent(initial.draft, '#2F5D8C')));

    expect(result.current.canRedo).toBe(false);
    expect(result.current.design.accent).toBe('#2F5D8C');
  });

  it('autosaves once after the pause, not once per keystroke', async () => {
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));
    act(() => result.current.set(withAccent(initial.draft, '#8C4A2E')));
    expect(saveDraft).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0]?.[1]).toMatchObject({ accent: '#8C4A2E' });
  });

  it('keeps taking edits offline and never publishes there', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    /* Черновик принят локально, но на сервер не уехал — и статус говорит об
       этом словами, а не молчит. */
    expect(result.current.design.accent).toBe('#8C4A2F');
    expect(result.current.status).toBe('offline');
    expect(saveDraft).not.toHaveBeenCalled();

    /* Вернулась сеть — черновик уезжает сам, без единого действия мастера.
       Событие и его последствия — в одном `act`: `waitFor` здесь опрашивал бы
       состояние своим таймером поверх фейковых, и счёт сохранений считал бы
       не хук, а харнесс. */
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0]?.[1]).toMatchObject({ accent: '#8C4A2F' });
  });

  it('shows the try-on above the draft and the peek above both', () => {
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));
    expect(result.current.preview.accent).toBe('#8C4A2F');

    act(() => result.current.tryOn(withAccent(initial.draft, '#2F5D8C')));
    expect(result.current.preview.accent).toBe('#2F5D8C');

    act(() => result.current.setPeeking(true));
    expect(result.current.preview.accent).toBeNull();

    act(() => result.current.setPeeking(false));
    act(() => result.current.tryOn(null));
    expect(result.current.preview.accent).toBe('#8C4A2F');
  });

  it('publishes what the master sees and resets the session', async () => {
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));
    await act(async () => {
      await result.current.publish();
    });

    expect(publish).toHaveBeenCalledWith('anna', expect.objectContaining({ accent: '#8C4A2F' }));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.status).toBe('published');
  });

  it('keeps the draft intact when publishing fails', async () => {
    publish.mockRejectedValueOnce(new Error('network'));
    const initial = makeState();
    const { result } = renderHook(() => useStudio('anna', initial));

    act(() => result.current.set(withAccent(initial.draft, '#8C4A2F')));
    await act(async () => {
      await expect(result.current.publish()).rejects.toThrow('network');
    });

    expect(result.current.design.accent).toBe('#8C4A2F');
    expect(result.current.isDirty).toBe(true);
    expect(result.current.status).toBe('error');
  });
});
