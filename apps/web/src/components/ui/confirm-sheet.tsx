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
  onConfirm: () => void;
  loading?: boolean;
}

/** Reusable destructive-action confirmation (cancel booking, delete service/client, block, log out). */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
}: ConfirmSheetProps) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
          {t.common.cancel}
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={loading}>
          {loading ? t.common.processing : (confirmLabel ?? t.common.delete)}
        </Button>
      </div>
    </Sheet>
  );
}
