// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '@/lib/i18n';
import { en } from '@/lib/i18n/en';
import { ru } from '@/lib/i18n/messages';
import { fmt } from '@/lib/i18n/messages';

import { useLocalizedValidation } from './use-localized-validation';

/**
 * Встроенная проверка формы, сказанная словами страницы.
 *
 * Браузер отвечает на пустое обязательное поле, на недописанный адрес почты и
 * на число вне диапазона сам — и отвечает на своём языке, а не на языке
 * страницы. Хук был подключён ко всем четырём экранам входа и ни к одной форме
 * кабинета: русский кабинет показывал «Value must be greater than or equal
 * to 5.» на длительности услуги.
 *
 * Своей проверки здесь нет и быть не должно: ограничения остаются на самих
 * полях, где их видит и браузер, и вспомогательная техника. Меняются только
 * слова. Поэтому тест смотрит на `validationMessage` узла — то, что браузер
 * скажет вслух, — а не на разметку.
 */

afterEach(cleanup);

/* Хук читает словарь из контекста, поэтому он обязан быть вызван **внутри**
   провайдера — как и в приложении, где форма живёт внутри кабинета. */
function Fields({ children }: { children: React.ReactNode }) {
  const validate = useLocalizedValidation();
  return (
    <form ref={validate} onSubmit={(event) => event.preventDefault()}>
      {children}
      <button type="submit">Отправить</button>
    </form>
  );
}

function Form({ locale, children }: { locale: string; children: React.ReactNode }) {
  return (
    <I18nProvider locale={locale}>
      <Fields>{children}</Fields>
    </I18nProvider>
  );
}

/** Отправляет форму и возвращает то, что браузер сказал про поле. */
function complain(testId = 'field'): string {
  fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));
  return (screen.getByTestId(testId) as HTMLInputElement).validationMessage;
}

describe('useLocalizedValidation — язык подсказки', () => {
  it('пустое обязательное поле объясняется по-русски', () => {
    render(
      <Form locale="ru">
        <input data-testid="field" required />
      </Form>,
    );

    expect(complain()).toBe(ru.validation.required);
  });

  it('то же поле в английском кабинете — по-английски', () => {
    render(
      <Form locale="en">
        <input data-testid="field" required />
      </Form>,
    );

    expect(complain()).toBe(en.validation!.required);
  });

  it('подсказка не остаётся браузерной', () => {
    render(
      <Form locale="ru">
        <input data-testid="field" required />
      </Form>,
    );

    expect(complain()).not.toMatch(/fill out|Please fill in this field$/i);
  });
});

describe('useLocalizedValidation — что именно не так', () => {
  it('недописанный адрес почты — своя фраза, а не общая', () => {
    render(
      <Form locale="ru">
        <input data-testid="field" type="email" defaultValue="anna@" />
      </Form>,
    );

    expect(complain()).toBe(ru.validation.email);
  });

  it('число ниже минимума называет минимум, а не «проверьте значение»', () => {
    // Ровно случай формы услуги: длительность с `min="5"`.
    render(
      <Form locale="ru">
        <input data-testid="field" type="number" min={5} defaultValue={-5} />
      </Form>,
    );

    expect(complain()).toBe(fmt(ru.validation.tooSmall, { min: '5' }));
  });

  it('число выше максимума называет максимум', () => {
    render(
      <Form locale="ru">
        <input data-testid="field" type="number" max={100} defaultValue={500} />
      </Form>,
    );

    expect(complain()).toBe(fmt(ru.validation.tooBig, { max: '100' }));
  });

  it('всё прочее сводится к общей фразе, а не к пустоте', () => {
    render(
      <Form locale="ru">
        <input data-testid="field" pattern="[a-z]+" defaultValue="123" />
      </Form>,
    );

    expect(complain()).toBe(ru.validation.invalid);
  });
});

describe('useLocalizedValidation — жизнь подсказки', () => {
  it('правка поля снимает подсказку, иначе оно осталось бы невалидным навсегда', () => {
    render(
      <Form locale="ru">
        <input data-testid="field" required />
      </Form>,
    );
    expect(complain()).toBe(ru.validation.required);

    fireEvent.input(screen.getByTestId('field'), { target: { value: 'Анна' } });

    expect((screen.getByTestId('field') as HTMLInputElement).validationMessage).toBe('');
  });

  it('валидное поле молчит', () => {
    render(
      <Form locale="ru">
        <input data-testid="field" required defaultValue="Анна" />
      </Form>,
    );

    expect(complain()).toBe('');
  });

  it('список без длины не роняет разбор', () => {
    // У `<select>` нет ни minLength, ни min — ветки длины и диапазона его
    // касаться не должны.
    render(
      <Form locale="ru">
        <select data-testid="field" required defaultValue="">
          <option value="">—</option>
          <option value="a">A</option>
        </select>
      </Form>,
    );

    expect(complain()).toBe(ru.validation.required);
  });
});
