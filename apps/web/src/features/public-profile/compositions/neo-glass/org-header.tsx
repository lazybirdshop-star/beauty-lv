'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';

import type { HeaderProps } from '../../contracts/sections';
import { cascade, ICON_BUTTON_CLASS } from './ui';

/**
 * Hero мира Neo Glass (§9 «Hero»): объекты в пространстве, а не блоки на
 * плоскости.
 *
 * Мета-полоса: слева стеклянная капсула «пин + город», справа круглые
 * стеклянные иконко-кнопки звонка и Instagram. Ниже — имя Unbounded 600
 * прямо на амбайенте (16.1:1 по измерению палитры) и фото-поле справа от
 * него: стеклянная рама 20px со световой кромкой и холодным скримом
 * `bg/55`, который выравнивает любой входящий кадр. Без фотографии рама
 * не пустует — её место занимает круглая стеклянная монограмма
 * (`--avatar-radius: 50%`).
 *
 * Фотография остаётся в раме и не уходит фоном страницы: контраст имени на
 * произвольном кадре мастера ничем не гарантирован, а глубину здесь несёт
 * амбайент (расхождение с референсом — в отчёте шага).
 *
 * Первый кадр — материализация: поверхности приходят `scale(0.96) → 1` с
 * подъёмом на пружинной кривой, каскад 45ms сверху вниз.
 */
export function OrgHeader({ org }: HeaderProps) {
  const t = useT();

  /* Кадр рамы: обложка шапки, когда мастер её выбрала; иначе — фото
     профиля, если она разрешила его показывать. */
  const portraitUrl =
    (org.heroStyle === 'image' ? org.coverUrl : undefined) ??
    (org.showAvatar ? org.logoUrl : undefined);
  const showFrame = portraitUrl !== undefined || org.showAvatar;

  return (
    /* Нижний воздух не декоративен: стопка островов наезжает на шапку на
       −32px (`--panel-overlap`), и без него навигационная капсула села бы
       на последнюю строку подписи. Перекрытие обязано приходиться на поле,
       а не на текст. */
    <header className="pb-12 pt-6 lg:pb-0 lg:pt-0">
      <div
        className="anim-neo-glass-materialize flex items-center justify-between gap-3"
        style={cascade(0)}
      >
        {org.city ? (
          <span className="neo-glass-pane inline-flex min-w-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium text-ink-soft">
            <MapPin size={14} weight="regular" aria-hidden="true" className="shrink-0" />
            <span className="truncate">{org.city}</span>
          </span>
        ) : (
          <span aria-hidden="true" />
        )}

        <div className="flex shrink-0 gap-2">
          {org.phone ? (
            <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={ICON_BUTTON_CLASS}>
              <Phone size={18} weight="regular" />
              <span className="sr-only">{t.publicPage.callMaster}</span>
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={ICON_BUTTON_CLASS}
            >
              <InstagramLogo size={18} weight="regular" />
              <span className="sr-only">{t.publicPage.masterInstagram}</span>
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-7 flex items-start gap-4 lg:mt-6 lg:block">
        <div className="anim-neo-glass-materialize min-w-0 flex-1" style={cascade(1)}>
          <h1 className="font-display text-[clamp(2rem,9vw,3.4rem)] leading-[1.02] tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink lg:text-[clamp(2rem,3.4vw,2.8rem)]">
            {org.name}
          </h1>

          {org.tagline ? (
            <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-ink-soft">
              {org.tagline}
            </p>
          ) : null}
        </div>

        {showFrame ? (
          <div
            className={cn(
              'anim-neo-glass-materialize shrink-0 lg:mt-6',
              portraitUrl
                ? 'w-[38%] max-w-[188px] lg:w-full lg:max-w-none'
                : /* Монограмма — не фото-поле: круг держит свой размер, а не
                     долю ширины, иначе на телефоне он вырастает в диск,
                     спорящий с именем. */
                  'w-[104px]',
            )}
            style={cascade(2)}
          >
            {portraitUrl ? (
              /* Рама — стекло: кромка и блик лежат поверх кадра, скрим
                 держит холодный тон мира на любой фотографии. */
              <div className="neo-glass-pane relative aspect-square overflow-hidden rounded-[var(--media-radius)] lg:aspect-[4/3]">
                {/* Masters paste an arbitrary photo URL, so this stays a plain
                    <img> rather than opening next/image's optimizer to any host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span aria-hidden="true" className="absolute inset-0 bg-bg/55" />
              </div>
            ) : (
              <div
                className="neo-glass-pane flex aspect-square items-center justify-center rounded-[var(--avatar-radius)]"
                aria-hidden="true"
              >
                <span className="font-display text-[28px] [font-weight:var(--display-weight)] text-ink lg:text-[34px]">
                  {org.avatarInitials}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
