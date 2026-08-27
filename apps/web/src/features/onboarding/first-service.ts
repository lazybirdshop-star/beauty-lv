/**
 * Заполнена ли форма первой услуги — и не заводим ли мы её за €0.00.
 *
 * Отдельно от компонента, потому что это правило, а не разметка. Проверка была
 * `Number(price) >= 0`, а `Number('') === 0`: шаг проходился целиком, не тронув
 * поле цены, и заводил активную услугу за €0.00, доступную к записи на
 * публичной странице. Длительность при этом приходила настоящим значением
 * `60`, а цена — только плейсхолдером `35`, и стоят они рядом.
 *
 * Ноль остаётся законным, но названным вслух: бесплатная услуга бывает, а
 * молчаливая бесплатная — почти всегда промах.
 */
export interface FirstServiceDraft {
  name: string;
  /** Строки, а не числа: это то, что лежит в полях, вместе с их пустотой. */
  duration: string;
  price: string;
  /** Мастер подтвердила, что услуга действительно бесплатная. */
  freeConfirmed: boolean;
}

export interface FirstServiceCheck {
  /** Введён явный ноль — форма обязана спросить об этом словами. */
  isFree: boolean;
  /** Можно отправлять. */
  valid: boolean;
}

export function checkFirstService(draft: FirstServiceDraft): FirstServiceCheck {
  const price = Number(draft.price);
  const priceEntered = draft.price.trim() !== '' && Number.isFinite(price);
  const isFree = priceEntered && price === 0;
  const priceValid = priceEntered && price >= 0 && (!isFree || draft.freeConfirmed);

  return {
    isFree,
    valid: draft.name.trim().length > 0 && Number(draft.duration) > 0 && priceValid,
  };
}
