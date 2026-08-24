'use client';

import { useCallback, useRef } from 'react';

import { fmt, useT } from '@/lib/i18n';
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

      const onInvalid = (event: Event) => {
        const control = event.target as Control;
        /* Сначала снять своё сообщение, иначе поле остаётся невалидным по
           `customError` и настоящая причина уже не читается. */
        control.setCustomValidity('');
        control.setCustomValidity(describe(control, words));
      };

      const onEdit = (event: Event) => {
        (event.target as Control).setCustomValidity('');
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

/**
 * Причина отказа в порядке, в котором её стоит называть: сначала то, что
 * человек может исправить одним действием.
 */
function describe(control: Control, words: Messages['validation']): string {
  const validity = control.validity;

  if (validity.valueMissing) return words.required;
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
