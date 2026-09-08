'use client';

import { useState } from 'react';

import { useT } from '@/lib/i18n';

/**
 * Предпросмотр страницы — правая половина артборда `ProfilePage.dc.html`.
 *
 * Настоящая страница во фрейме, а не её изображение: изображение стареет с
 * первой же правкой оформления, а фрейм показывает то, что клиент увидит
 * сегодня. Тот же изолированный документ, что и у Студии, — у публичной
 * страницы свои токены в `:root`, и делить его с кабинетом нельзя.
 *
 * Обновляется по сохранению, а не по каждому нажатию клавиши: правка едет на
 * сервер целиком, и перерисовывать страницу на каждую букву значило бы
 * посылать запрос на каждую букву.
 */
export function PagePreview({ slug }: { slug: string }) {
  const t = useT();
  const [device, setDevice] = useState<'mobile' | 'desktop'>('mobile');

  return (
    <aside className="profile-preview">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="t-meta">{t.pageSettings.previewHint}</span>
        <div className="seg">
          {(['mobile', 'desktop'] as const).map((key) => (
            <div
              key={key}
              role="button"
              tabIndex={0}
              className={device === key ? 'is-on' : undefined}
              onClick={() => setDevice(key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setDevice(key);
              }}
            >
              {key === 'mobile' ? t.pageSettings.deviceMobile : t.pageSettings.deviceDesktop}
            </div>
          ))}
        </div>
      </div>

      <div className={device === 'mobile' ? 'profile-frame is-mobile' : 'profile-frame'}>
        <iframe src={`/${slug}/studio-preview`} title={t.pageSettings.previewHint} loading="lazy" />
      </div>
    </aside>
  );
}
