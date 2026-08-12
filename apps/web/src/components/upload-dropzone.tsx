'use client';

import { SpinnerGap, UploadSimple } from '@phosphor-icons/react';
import { useParams } from 'next/navigation';
import { useRef, useState, type DragEvent } from 'react';

import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import {
  UploadError,
  uploadImage,
  type UploadFailure,
  type UploadTarget,
} from '@/lib/image-upload';

/**
 * Выбрать файл или перетащить его — одинаково для страницы и для услуги.
 *
 * Компонент отдаёт наружу только готовый адрес: как именно кадр ужимался и
 * куда лёг, вызывающему знать не нужно, а ошибка приходит уже словами на
 * языке мастера. Держит собственное состояние занятости, потому что два
 * параллельных выбора файла — это не то, что должна разруливать форма.
 */
export function UploadDropzone({
  target,
  hasImage,
  onUploaded,
  onStart,
}: {
  target: UploadTarget;
  /** Меняет только подпись кнопки: «Загрузить» против «Заменить». */
  hasImage: boolean;
  onUploaded: (url: string) => void;
  /** Форме бывает нужно снять свою ошибку до начала загрузки. */
  onStart?: () => void;
}) {
  const t = useT();
  const params = useParams<{ slug: string }>();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failure, setFailure] = useState<UploadFailure | null>(null);

  const message: Record<UploadFailure, string> = {
    heic: t.studio.mediaErrorHeic,
    type: t.studio.mediaErrorType,
    tooLarge: t.studio.mediaErrorTooLarge,
    failed: t.studio.mediaErrorFailed,
  };

  async function accept(file: File | undefined) {
    if (!file || busy) return;
    setFailure(null);
    onStart?.();
    setBusy(true);
    try {
      onUploaded(await uploadImage(params.slug, file, target));
    } catch (error) {
      setFailure(error instanceof UploadError ? error.reason : 'failed');
    } finally {
      setBusy(false);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void accept(event.dataTransfer.files[0]);
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col gap-2 rounded-xl border border-dashed p-3 transition-colors ${
          dragging ? 'border-accent bg-accent-soft' : 'border-border bg-bg-sunken'
        }`}
      >
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="w-full"
        >
          {busy ? <SpinnerGap size={16} className="animate-spin" /> : <UploadSimple size={16} />}
          {busy ? t.studio.mediaUploading : hasImage ? t.studio.mediaReplace : t.studio.mediaUpload}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void accept(event.target.files?.[0]);
            // Иначе повторный выбор того же файла не вызовет события.
            event.target.value = '';
          }}
        />
        <p className="text-center text-[11px] leading-relaxed text-ink-faint">
          {t.studio.mediaDropHint}
        </p>
      </div>

      {failure ? (
        <p role="alert" className="rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning">
          {message[failure]}
        </p>
      ) : null}
    </div>
  );
}
