'use client';

import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Name the consequence in the other person's terms — «Клиент увидит запись как отменённую», not «Вы уверены?». */
  description?: string;
  confirmLabel?: string;
  /**
   * Подпись отказа. Умолчание «Отмена» годится, пока действие не называется
   * отменой само: на листе «Отменить визит?» две кнопки со словом «отменить»
   * означают противоположное друг другу, и читать их приходится дважды.
   */
  dismissLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  /** Мир, в котором рисуется лист, — см. `Sheet`. */
  surface?: 'app' | 'plain';
  /**
   * `danger` — необратимое (удалить, отменить визит): согласие красным.
   * `primary` — обратимое, но требующее слова (выйти из кабинета): согласие
   * главной кнопкой, как в окне `logout` прототипа.
   */
  tone?: 'danger' | 'primary';
}

/**
 * Reusable destructive-action confirmation (cancel booking, delete service/client, block, log out).
 *
 * В кабинете это диалог прототипа «Кабинет 2026»: карточка по центру,
 * отказ — призрачная кнопка первой, согласие — красное справа; на телефоне
 * лист снизу, согласие над отказом во всю ширину. Кабинет клиента и
 * публичная страница (`surface="plain"`) держат прежний лист с двумя
 * равными кнопками.
 */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  dismissLabel,
  onConfirm,
  loading,
  surface,
  tone = 'danger',
}: ConfirmSheetProps) {
  const t = useT();
  const inApp = surface !== 'plain';
  const equal = inApp ? undefined : 'flex-1';
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      surface={surface}
      kind={inApp ? 'dialog' : 'panel'}
    >
      <div className={inApp ? 'confirm-acts' : 'flex gap-3'}>
        <Button
          variant={inApp ? 'ghost' : 'secondary'}
          className={equal}
          onClick={() => onOpenChange(false)}
        >
          {dismissLabel ?? t.common.cancel}
        </Button>
        <Button
          variant={tone === 'primary' ? 'primary' : 'danger-solid'}
          className={equal}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? t.common.processing : (confirmLabel ?? t.common.delete)}
        </Button>
      </div>
    </Sheet>
  );
}
