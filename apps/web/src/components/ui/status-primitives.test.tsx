// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ru } from '@/lib/i18n/messages';

import { Badge } from './badge';
import { FieldError } from './field-error';
import { LoadError } from './load-error';
import { RowAction } from './row-action';
import { StatTile } from './stat-tile';
import { Switch } from './switch';

/**
 * Мелкие примитивы, которыми кабинет говорит о состоянии.
 *
 * Их объединяет одно правило системы: ни цвет, ни значок, ни высота не имеют
 * права быть единственным носителем смысла. Точка статуса идёт со словом,
 * ошибка поля — с ролью, значок строки — с доступным именем, переключатель — с
 * подписью. Здесь проверяется именно это, а не оформление.
 */

afterEach(cleanup);

describe('Badge — статус словом, а не одной краской', () => {
  it('подпись рядом с точкой обязательна и видна', () => {
    render(<Badge tone="success">Подтверждена</Badge>);

    expect(screen.getByText('Подтверждена')).toBeTruthy();
  });

  it('сама точка от читалки скрыта — она повторяет то же слово краской', () => {
    const { container } = render(<Badge tone="danger">Отменена</Badge>);

    const dot = container.querySelector('[aria-hidden="true"]');
    expect(dot).toBeTruthy();
    expect(dot!.className).toContain('bg-danger');
  });

  it('без указанного тона точка нейтральна, а не случайна', () => {
    const { container } = render(<Badge>Завершена</Badge>);

    expect(container.querySelector('[aria-hidden="true"]')!.className).toContain('bg-ink-faint');
  });

  it('каждый тон красит точку своим токеном', () => {
    for (const [tone, expected] of [
      ['accent', 'bg-accent'],
      ['success', 'bg-success'],
      ['warning', 'bg-warning'],
      ['danger', 'bg-danger'],
    ] as const) {
      const { container, unmount } = render(<Badge tone={tone}>Статус</Badge>);
      expect(container.querySelector('[aria-hidden="true"]')!.className).toContain(expected);
      unmount();
    }
  });
});

describe('FieldError — одна грамматика ошибки на все формы', () => {
  it('объявляется читалке в момент появления', () => {
    render(<FieldError>Телефон не похож на телефон</FieldError>);

    expect(screen.getByRole('alert').textContent).toContain('Телефон не похож на телефон');
  });

  it('значок рядом с текстом от читалки скрыт — иначе он прозвучал бы вместо текста', () => {
    const { container } = render(<FieldError>Ошибка</FieldError>);

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('LoadError — правда вместо пустого списка', () => {
  it('говорит, что не загрузилось, а не «записей пока нет»', () => {
    // «Записей пока нет» после обрыва сети читается как «мои записи пропали» —
    // самая страшная фраза, какую продукт может сказать мастеру.
    render(<LoadError onRetry={() => {}} />);

    expect(screen.getByText(ru.common.loadFailed)).toBeTruthy();
  });

  it('объявляется читалке', () => {
    render(<LoadError onRetry={() => {}} />);

    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('возвращает управление: кнопка повтора зовёт повтор', () => {
    const onRetry = vi.fn();
    render(<LoadError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: ru.common.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('RowAction — значок с именем', () => {
  it('иконка без подписи получает доступное имя', () => {
    render(<RowAction label="Изменить" icon={<span />} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Изменить' })).toBeTruthy();
  });

  it('то же слово идёт подсказкой при наведении', () => {
    render(<RowAction label="Удалить" icon={<span />} onClick={() => {}} />);

    expect(screen.getByRole('button', { name: 'Удалить' }).getAttribute('title')).toBe('Удалить');
  });

  it('это кнопка, а не отправка формы — строка списка формой не является', () => {
    render(<RowAction label="Изменить" icon={<span />} onClick={() => {}} />);

    expect(screen.getByRole('button').getAttribute('type')).toBe('button');
  });

  it('44×44 — пол касания продукта, а не 40', () => {
    render(<RowAction label="Изменить" icon={<span />} onClick={() => {}} />);

    // h-11/w-11 в Tailwind — это ровно 44px.
    expect(screen.getByRole('button').className).toContain('h-11');
    expect(screen.getByRole('button').className).toContain('w-11');
  });
});

describe('StatTile — число с подписью', () => {
  it('метка, значение и пояснение читаются все три', () => {
    render(<StatTile label="Доход" value="463,00 €" hint="завершённые визиты" />);

    expect(screen.getByText('Доход')).toBeTruthy();
    expect(screen.getByText('463,00 €')).toBeTruthy();
    expect(screen.getByText('завершённые визиты')).toBeTruthy();
  });

  it('без пояснения лишней пустой строки не появляется', () => {
    const { container } = render(<StatTile label="Клиенты" value="8" />);

    expect(container.querySelectorAll('span')).toHaveLength(2);
  });

  it('ведущая плитка отличается воздухом и кеглем, а не краской', () => {
    // Розовый в системе занят двумя ролями — кнопкой записи и занятым
    // временем; выделять им плитку нельзя.
    const { container } = render(<StatTile label="Доход" value="463" emphasis="lead" />);

    const tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain('py-6');
    expect(tile.className).not.toContain('bg-accent');
  });

  it('значение может быть узлом — счётчик приходит компонентом', () => {
    render(<StatTile label="Клиенты" value={<b>8</b>} />);

    expect(screen.getByText('8').tagName).toBe('B');
  });
});

describe('Switch — переключатель со своим именем', () => {
  it('объявляется читалке как переключатель', () => {
    render(
      <Switch checked={false} onCheckedChange={() => {}} label="Подтверждать автоматически" />,
    );

    expect(screen.getByRole('switch', { name: 'Подтверждать автоматически' })).toBeTruthy();
  });

  it('состояние читается, а не угадывается по цвету', () => {
    render(<Switch checked onCheckedChange={() => {}} label="Показывать цены" />);

    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('нажатие сообщает новое состояние, а не переключает само себя', () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Показывать цены" />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('запертый переключатель не сообщает ничего', () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked disabled onCheckedChange={onCheckedChange} label="Показывать цены" />);

    fireEvent.click(screen.getByRole('switch'));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('область касания вырастает до 44px, не меняя вида дорожки', () => {
    // Дорожка 48×28 по рисунку — ниже пола касания; псевдоэлемент добирает
    // недостающее, не сдвигая ни пикселя видимого.
    render(<Switch checked={false} onCheckedChange={() => {}} label="Показывать цены" />);

    expect(screen.getByRole('switch').className).toContain('after:-inset-y-2');
  });
});
