import type { ReactNode } from 'react';

/**
 * Опасная зона — одно место и один вид у необратимого действия (прототип
 * «Кабинет 2026»).
 *
 * Разрушающее действие в кабинете оформлялось четырьмя способами: красной
 * кнопкой в подвале, тихой ссылкой, голой иконкой корзины в строке и обычной
 * секцией формы. Слот подвала при этом делили отмена и удаление — то есть в
 * одном месте оказывались и «ничего не делать», и «сделать необратимое».
 *
 * Теперь необратимое живёт в теле шторки, в обведённом красным блоке, рядом с
 * фразой о последствиях. Подвал остаётся за отменой и главным действием.
 */
export function DangerZone({
  title,
  hint,
  children,
}: {
  title: ReactNode;
  /** Что случится: одна фраза, без «вы уверены». */
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="danger-zone">
      <h3 className="danger-zone__title type-meta">{title}</h3>
      <div className="danger-zone__actions">{children}</div>
      {hint ? <p className="danger-zone__hint type-meta">{hint}</p> : null}
    </section>
  );
}
