'use client';

import { useState } from 'react';

import { useT } from '@/lib/i18n';

/**
 * Предпросмотр страницы — `.page-preview` прототипа «Кабинет 2026».
 *
 * Настоящая страница во фрейме, а не её изображение: изображение стареет с
 * первой же правкой оформления, а фрейм показывает то, что клиент увидит
 * сегодня. Тот же изолированный документ, что и у Студии, — у публичной
 * страницы свои токены в `:root`, и делить его с кабинетом нельзя.
 *
 * Обновляется по сохранению, а не по каждому нажатию клавиши: правка едет на
 * сервер целиком, и перерисовывать страницу на каждую букву значило бы
 * посылать запрос на каждую букву.
 *
 * Поверхность вокруг задаёт экран: на «Странице» и на витрине услуг это
 * ниша, в которой лежит фрейм.
 */
export function PagePreview({ slug }: { slug: string }) {
  const t = useT();
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <div className="profile-preview">
      <div className="profile-preview__bar">
        <span className="profile-preview__hint">{t.pageSettings.previewHint}</span>
        <div className="seg-pills" role="group" aria-label={t.pageSettings.previewHint}>
          {(['mobile', 'desktop'] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
            >
              {key === 'mobile' ? t.pageSettings.deviceMobile : t.pageSettings.deviceDesktop}
            </button>
          ))}
        </div>
      </div>

      <div className={device === 'mobile' ? 'profile-frame is-mobile' : 'profile-frame'}>
        <iframe src={`/${slug}/studio-preview`} title={t.pageSettings.previewHint} loading="lazy" />
      </div>
    </div>
  );
}
