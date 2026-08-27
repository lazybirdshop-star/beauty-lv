'use client';

import { InstagramLogo, MapPin, Phone } from '@phosphor-icons/react/dist/ssr';

import { cn } from '@/lib/utils';

import { useT } from '@/lib/i18n';

import type { PublicOrganization } from '../../engine/types';
import { HeroMedia } from '../../shared/hero-media';

import { HeroGradient } from './hero-gradient';

const ACTION_CLASS =
  'press glass flex h-11 w-11 items-center justify-center rounded-full text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export function OrgHeader({ org }: { org: PublicOrganization }) {
  const t = useT();
  /*
   * Портрет в мягком мире стоит вырезкой — без рамки, без карточки, без
   * тени-подложки, — и это свойство мира, а не вывод о файле.
   *
   * Прежде обращение зависело от расширения (`/\.png$/`), и сработать оно не
   * могло никогда: браузер пережимает любую загрузку в WebP
   * (`lib/image-upload.ts`), поэтому адрес всегда оканчивался на `.webp`.
   * Мастер грузила PNG без фона и получала его в прямоугольной карточке —
   * ровно то, чего вырезка должна была избежать. Признак был недостижим по
   * построению, а не редко ложен, поэтому он снят, а не уточнён: мир держит
   * одно обращение с портретом, и Студия называет его словами.
   */
  const portrait = org.design.masterPhoto.shown ? org.design.masterPhoto.media : null;
  const showBanner = Boolean(org.design.heroPhoto);

  return (
    <header
      data-studio-zone="heroPhoto"
      /* The bottom pad is what the panel rides into: 16px of real air minus
         the world's `--panel-overlap` (−96px by default — the pb-28 this
         used to hard-code; 16px net where the overlap is 0). */
      className="relative px-5 pb-[calc(1rem_-_var(--panel-overlap))] pt-4 lg:overflow-hidden lg:rounded-[var(--panel-radius)] lg:px-7 lg:pb-8 lg:pt-7 lg:shadow-[var(--media-shadow)]"
    >
      {showBanner ? (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-full overflow-hidden">
          {/* Фото и видео первого экрана — общий слой продукта: его законы
              (постер, отсутствие звука, reduced-motion) одинаковы во всех мирах,
              и мир задаёт только кадр. */}
          <HeroMedia design={org.design} className="h-full w-full" />
          {/*
            Имя стоит поверх неизвестной фотографии, поэтому ему нужен свой
            пол контраста — но пол, а не потолок.

            Прежняя вуаль (`from-bg via-bg/80 to-bg/35`) держала 80% земли на
            всей высоте и 35% даже на самом верху: фотография мастера
            переставала быть фотографией. Здесь вуаль привязана ко дну — там,
            где действительно лежит текст и куда наезжает панель, — и сходит
            на нет к середине кадра. Верхняя половина снимка видна как есть;
            стеклянные кнопки телефона и Instagram несут свой фон и в вуали не
            нуждаются.
          */}
          <div className="absolute inset-0 bg-gradient-to-t from-bg from-[12%] via-bg/55 via-[42%] to-bg/0" />
        </div>
      ) : (
        /* The gradient is the hero's surface. No frosted layer of its own:
           the panel below is what overlaps it, and two sheets of glass
           stacked would flatten the gradient and read as one slab. */
        <HeroGradient />
      )}

      <div className="relative">
        <div className="flex justify-end gap-2">
          {org.phone ? (
            <a href={`tel:${org.phone.replace(/\s/g, '')}`} className={ACTION_CLASS}>
              <Phone size={18} weight="fill" />
              <span className="sr-only">{t.publicPage.callMaster}</span>
            </a>
          ) : null}
          {org.instagram ? (
            <a
              href={`https://instagram.com/${org.instagram}`}
              target="_blank"
              rel="noreferrer noopener"
              className={ACTION_CLASS}
            >
              <InstagramLogo size={18} />
              <span className="sr-only">{t.publicPage.masterInstagram}</span>
            </a>
          ) : null}
        </div>

        <div className="relative mt-2 flex items-end gap-4 lg:mt-4 lg:flex-col-reverse lg:items-stretch lg:gap-5">
          <div className="min-w-0 flex-1 pb-1">
            {org.city ? (
              <span className="glass press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-ink">
                <MapPin size={14} weight="fill" className="text-accent" />
                {org.city}
              </span>
            ) : null}

            {/* Weight and tracking are the world's own tokens: `inherit` and
                product-tight by default here. */}
            <h1 className="mt-3 font-display text-[38px] leading-[1.05] tracking-[var(--display-tracking)] [font-weight:var(--display-weight)] text-ink lg:text-[32px]">
              {org.name}
            </h1>

            {org.tagline ? (
              <p className="mt-2.5 line-clamp-3 max-w-prose text-sm leading-relaxed text-ink-soft">
                {org.tagline}
              </p>
            ) : null}
          </div>

          {/*
              Портрет без рамки: у вырезки нет собственного края, и карточка
              нарисовала бы границу, которой у фигуры нет. Обращение одно на
              любой файл — оно не возвращается даже под непрозрачным снимком:
              мир обещает вырезку, Студия просит PNG без фона, и обещание
              выполняется всегда, а не когда угадано расширение.

              Портрет **стоит над швом, а не на нём.** Раньше он опускался
              ровно на кромку панели (`-mb-4` съедал те 16px воздуха, что
              оставляет нижний отступ hero), и прямоугольный снимок — а таких
              большинство, вырезку грузят единицы — читался положенным на
              рамку календаря. Теперь эти 16px остаются воздухом, а нижняя
              кромка снимка гасится растушёвкой: фигура кончается мягко и
              никуда не упирается. Размер убавлен на тот же глаз — портрет
              перестал спорить с именем за первый экран телефона.

              На развороте отрицательного отступа нет вовсе. Там колонка
              перевёрнута (`lg:flex-col-reverse`): портрет стоит наверху
              карточки, имя под ним, — и `-mb-14` подтягивал имя на 56px
              вверх, так что чип города налезал на снимок. Это и было
              «сломано на веб-версии».
          */}
          {org.design.masterPhoto.shown ? (
            <div className="relative h-[206px] w-[40%] max-w-[172px] shrink-0 self-end drop-shadow-[0_18px_28px_rgb(0_0_0/0.18)] sm:h-[244px] lg:h-[190px] lg:w-full lg:max-w-none">
              {portrait ? (
                // Masters paste an arbitrary photo URL, so this stays a plain <img>
                // rather than opening next/image's optimizer to any remote host.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={portrait.url}
                  alt=""
                  loading="lazy"
                  className={cn(
                    'h-full w-full object-contain [object-position:var(--avatar-focal)]',
                    /*
                     * Растушёвка низа — приём шва, а не портрета, поэтому она
                     * живёт только там, где шов есть: на телефоне, где панель
                     * наезжает на hero. На развороте портрет стоит наверху
                     * собственной карточки, снизу под ним имя — и растушёвка
                     * там просто съедала подбородок.
                     *
                     * Она короткая (последние 4%) и теперь не доходит до
                     * панели, а гасит нижнюю кромку прямоугольного снимка:
                     * фотография кончается мягко, а не режется линейкой.
                     * Префикс обязателен — Safari до сих пор просит
                     * `-webkit-mask-image`.
                     */
                    'max-lg:[mask-image:linear-gradient(to_bottom,#000_96%,transparent_100%)]',
                    'max-lg:[-webkit-mask-image:linear-gradient(to_bottom,#000_96%,transparent_100%)]',
                  )}
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center rounded-[var(--avatar-radius)] bg-accent"
                  aria-hidden="true"
                >
                  <span className="font-display text-5xl text-accent-contrast">
                    {org.avatarInitials}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
