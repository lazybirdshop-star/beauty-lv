'use client';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}

/** Reusable destructive-action confirmation (delete service/client, block user, etc). */
export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Удалить',
  onConfirm,
  loading,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => onOpenChange(false)}>
          Отмена
        </Button>
        <Button variant="danger" className="flex-1" onClick={onConfirm} disabled={loading}>
          {loading ? 'Удаляем…' : confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
