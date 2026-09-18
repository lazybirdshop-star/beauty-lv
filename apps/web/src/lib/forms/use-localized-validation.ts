'use client';

import { useCallback, useRef } from 'react';

import { useT } from '@/lib/i18n';
import { fmt } from '@/lib/i18n/messages';
import type { Messages } from '@/lib/i18n/messages';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Встроенная проверка формы, сказанная словами страницы.
 *
 * Браузер отвечает на пустое обязательное поле и на недописанный адрес почты
 * сам, и отвечает на своём языке, а не на языке страницы. Читатель, открывший
 * лендинг по-латышски в браузере с русской локалью, видит русскую подсказку
 * посреди латышской формы; на «забыли пароль», где поле ровно одно, это
 * единственная строка, которую страница о себе говорит — и единственная не
 * переведённая.
 *
 * Своей проверки здесь нет и не должно быть: ограничения остаются на самих
 * полях (`required`, `type="email"`, `minLength`) — там их видит и браузер, и
 * вспомогательная техника. Меняются только слова, которыми браузер о них
 * рассказывает.
 *
 * В кабинете (`.amolie-app`) слова стоят строкой под полем, а не системным
 * пузырём. Пузырь браузера рисовался чужим шрифтом поверх шторки, а у формы,
 * чья кнопка стоит в подвале шторки, не появлялся вовсе: поле молча получало
 * фокус, и человек не знал, что не так. Строка под полем — та же, что у
 * отказа сервера: цвет, `role="alert"`, связь через `aria-describedby`.
 * Публичные страницы и вход живут в своих мирах и оставляют пузырь.
 */
export function useLocalizedValidation<T extends HTMLFormElement = HTMLFormElement>() {
  const t = useT();
  const detach = useRef<(() => void) | null>(null);

  /*
   * Ref-обработчик, а не эффект: форма на этих экранах то есть, то нет — после
   * отправки «забыли пароль» показывает совсем другое дерево, — и эффект,
   * привязанный к первому рендеру, слушал бы узел, которого уже нет в
   * документе.
   */
  return useCallback(
    (form: T | null) => {
      detach.current?.();
      detach.current = null;
      if (!form) return;

      const words = t.validation;
      const inline = form.closest('.amolie-app') !== null;
      /* Фокус — только первому провалу одной отправки: `invalid` приходит
         на каждое поле подряд, и фокус иначе уезжал бы на последнее. */
      let focusedThisTurn = false;

      const onInvalid = (event: Event) => {
        const control = event.target as Control;
        /* Сначала снять своё сообщение, иначе поле остаётся невалидным по
           `customError` и настоящая причина уже не читается. */
        control.setCustomValidity('');
        const message = describe(control, words, inline ? labelOf(control) : null);
        control.setCustomValidity(message);
        if (!inline) return;

        event.preventDefault();
        showInline(control, message);
        if (!focusedThisTurn) {
          focusedThisTurn = true;
          control.focus();
          queueMicrotask(() => {
            focusedThisTurn = false;
          });
        }
      };

      const onEdit = (event: Event) => {
        const control = event.target as Control;
        control.setCustomValidity('');
        if (inline) clearInline(control);
      };

      /* `invalid` не всплывает — только перехват на пути вниз. `input` и
         `change` всплывают, поэтому им хватает обычной подписки. */
      form.addEventListener('invalid', onInvalid, true);
      form.addEventListener('input', onEdit);
      form.addEventListener('change', onEdit);

      detach.current = () => {
        form.removeEventListener('invalid', onInvalid, true);
        form.removeEventListener('input', onEdit);
        form.removeEventListener('change', onEdit);
      };
    },
    [t],
  );
}

const MESSAGE_ATTR = 'data-validation-for';

/** Подпись поля — текст его `<label>`, без звёздочек и лишних пробелов. */
function labelOf(control: Control): string | null {
  const text = control.labels?.[0]?.textContent?.replace(/[*:]/g, '').trim();
  return text ? text : null;
}

/**
 * Строка под полем. Узел добавляется рядом с разметкой React, а не вместо неё:
 * React не трогает чужих соседей, а строка уходит сама, как только поле
 * поправили.
 */
function showInline(control: Control, message: string) {
  const key = control.id || control.name;
  const host = control.closest('.form-field') ?? control.parentElement;
  if (!host || !key) return;

  let node = host.querySelector<HTMLElement>(`[${MESSAGE_ATTR}="${CSS.escape(key)}"]`);
  if (!node) {
    node = document.createElement('p');
    node.className = 'form-field__error';
    node.setAttribute('role', 'alert');
    node.setAttribute(MESSAGE_ATTR, key);
    node.id = `${key}-validation`;
    host.appendChild(node);
  }
  node.textContent = message;

  control.setAttribute('aria-invalid', 'true');
  const described = (control.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
  if (!described.includes(node.id)) {
    control.setAttribute('aria-describedby', [...described, node.id].join(' '));
  }
}

function clearInline(control: Control) {
  const key = control.id || control.name;
  if (!key || control.getAttribute('aria-invalid') !== 'true') return;
  const host = control.closest('.form-field') ?? control.parentElement;
  const node = host?.querySelector<HTMLElement>(`[${MESSAGE_ATTR}="${CSS.escape(key)}"]`);
  control.removeAttribute('aria-invalid');
  if (node) {
    const rest = (control.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter((id) => id && id !== node.id);
    if (rest.length) control.setAttribute('aria-describedby', rest.join(' '));
    else control.removeAttribute('aria-describedby');
    node.remove();
  }
}

/**
 * Причина отказа в порядке, в котором её стоит называть: сначала то, что
 * человек может исправить одним действием.
 */
function describe(
  control: Control,
  words: Messages['validation'],
  label: string | null = null,
): string {
  const validity = control.validity;

  /* Строка под полем называет поле: «Заполните это поле» в каждой форме
     одинаково не говорило, какое именно. */
  if (validity.valueMissing) return label ? fmt(words.requiredNamed, { label }) : words.required;
  if (validity.typeMismatch) {
    return control instanceof HTMLInputElement && control.type === 'email'
      ? words.email
      : words.invalid;
  }
  /* Длину и диапазон знают поле ввода и многострочное поле; у списка их нет
     вовсе. */
  if (!(control instanceof HTMLSelectElement)) {
    if (validity.tooShort) return fmt(words.tooShort, { min: control.minLength });
    if (validity.tooLong) return fmt(words.tooLong, { max: control.maxLength });
  }

  /* Числовые границы — отдельной фразой, а не общим «проверьте значение».
     Форма услуги держит `min="5"` на длительности и `min="0"` на цене, и
     общая фраза не говорила мастеру ни что не так, ни что подставить. */
  if (control instanceof HTMLInputElement) {
    if (validity.rangeUnderflow) return fmt(words.tooSmall, { min: control.min });
    if (validity.rangeOverflow) return fmt(words.tooBig, { max: control.max });
    /* Шаг называется вместе с ближайшим подходящим значением: «кратно 5»
       без примера заставляет считать в уме. */
    if (validity.stepMismatch) return fmt(words.stepMismatch, { step: control.step });
  }

  return words.invalid;
}
