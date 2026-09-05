// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProgressRail, StepDoneBadge } from './progress-rail';
import { ONBOARDING_STEPS, isOnboardingStep } from '../types';

/**
 * Шкала первого запуска: где мастер сейчас, что позади и сколько осталось.
 *
 * Отрезки — кнопки, а не украшение: настройка не мастер-визард, который держит
 * человека в заложниках, и вернуться к адресу после того, как увидела свою
 * страницу, — нормальное желание. Отсюда две проверки, которые здесь и
 * главные: по каждому отрезку можно перейти, и каждый отрезок называет себя
 * словами — сама полоска высотой 6px читалке не говорит ничего.
 */

afterEach(cleanup);

const STEPS = [
  { key: 'address', label: 'Адрес страницы', done: true },
  { key: 'profile', label: 'Профиль', done: true },
  { key: 'design', label: 'Оформление', done: false },
  { key: 'services', label: 'Первая услуга', done: false },
];

function show(currentIndex = 2) {
  const onSelect = vi.fn();
  render(<ProgressRail steps={STEPS} currentIndex={currentIndex} onSelect={onSelect} />);
  return { onSelect };
}

describe('ProgressRail — сколько шагов и как они названы', () => {
  it('каждый шаг — отдельный пункт списка', () => {
    show();

    expect(screen.getAllByRole('listitem')).toHaveLength(STEPS.length);
  });

  it('каждый отрезок называет себя словами', () => {
    show();

    for (const step of STEPS) {
      expect(screen.getByRole('button', { name: step.label })).toBeTruthy();
    }
  });
});

describe('ProgressRail — где мастер сейчас', () => {
  it('текущий шаг помечен для читалки', () => {
    show(2);

    const current = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('aria-current') === 'step');

    expect(current).toHaveLength(1);
    expect(current[0]!.textContent).toBe('Оформление');
  });

  it('пройденный, текущий и будущий шаги различаются состоянием', () => {
    // Цвет полоски задаёт набор макета; здесь проверяется, что состояние до
    // него доезжает, — иначе все пять делений выглядели бы одинаково.
    const { container } = render(
      <ProgressRail steps={STEPS} currentIndex={2} onSelect={() => {}} />,
    );

    const items = [...container.querySelectorAll('li')];
    expect(items[0]!.className).toContain('is-done');
    expect(items[2]!.className).toContain('is-current');
    expect(items[3]!.className).not.toContain('is-done');
    container.remove();
  });
});

describe('ProgressRail — назад можно', () => {
  it('нажатие на пройденный шаг возвращает к нему', () => {
    // Настройка не держит в заложниках: вернуться к адресу после превью —
    // нормальное желание.
    const { onSelect } = show(2);

    fireEvent.click(screen.getByRole('button', { name: 'Адрес страницы' }));

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('вперёд тоже можно — шаги не заперты порядком', () => {
    const { onSelect } = show(0);

    fireEvent.click(screen.getByRole('button', { name: 'Первая услуга' }));

    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('каждый шаг остаётся кнопкой, а не полоской для красоты', () => {
    // Область нажатия дорастает до 44px в самом наборе (`.rail__button`);
    // здесь проверяется, что деление вообще нажимаемо.
    show();

    expect(screen.getAllByRole('button')).toHaveLength(STEPS.length);
  });
});

describe('StepDoneBadge — отметка завершённого шага', () => {
  it('несёт слово, а не одну галочку', () => {
    render(<StepDoneBadge label="Готово" />);

    expect(screen.getByText('Готово')).toBeTruthy();
  });

  it('галочка от читалки скрыта — она повторяет то же слово', () => {
    const { container } = render(<StepDoneBadge label="Готово" />);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('ONBOARDING_STEPS — шаги первого запуска', () => {
  it('порядок повторяет тот, что на сервере', () => {
    // Список зеркалит `ONBOARDING_STEPS` API; разъехавшись, они дадут мастеру
    // «шаг 3 из 6», который на сервере считается вторым.
    expect([...ONBOARDING_STEPS]).toEqual([
      'address',
      'profile',
      'design',
      'services',
      'schedule',
      'share',
    ]);
  });

  it('адрес идёт первым — с него начинается всё остальное', () => {
    expect(ONBOARDING_STEPS[0]).toBe('address');
  });

  it('«поделиться» идёт последним: он ждёт клиента, а не мастера', () => {
    expect(ONBOARDING_STEPS.at(-1)).toBe('share');
  });

  it('распознаёт свой шаг и не признаёт чужое', () => {
    // Ключ приходит из адресной строки: `?step=` пишет кто угодно.
    for (const step of ONBOARDING_STEPS) {
      expect(isOnboardingStep(step)).toBe(true);
    }
    for (const junk of ['', 'ADDRESS', 'payments', null, undefined, 0, {}]) {
      expect(isOnboardingStep(junk)).toBe(false);
    }
  });
});
