'use client';

import {
  DESIGN_PRESETS,
  describePageDesignChanges,
  FONT_PRESETS,
  styleLimits,
  THEME_PRESETS,
  type PageDesign,
  type PageDesignHandle,
} from '@amolie/shared-kernel';
import { useMemo } from 'react';

import { useT, type Messages } from '@/lib/i18n';

import type { StudioZone } from '../preview-bridge';

import { BackgroundSection } from './sections/background-section';
import { ButtonsSection } from './sections/buttons-section';
import { PhotosSection } from './sections/photos-section';
import { SectionShell } from './sections/section-shell';
import { StyleSection, hasOverrides } from './sections/style-section';
import { SurfacesSection, hasSurfaceChoices } from './sections/surfaces-section';
import { TextSection } from './sections/text-section';

/**
 * Шесть секций в фиксированном порядке — от идентичности к деталям
 * (DESIGN_STUDIO.md §3.2).
 *
 * Секция — не то же самое, что ручка. Десять строк инспектора отвечали на
 * десять вопросов, но мастер задаёт их себе меньше: «каким выглядит бизнес»,
 * «что за фон», «какого цвета кнопки», «какой шрифт и какого цвета текст»,
 * «какие рамки», «какие фотографии». Ручки под ними те же — сгруппированы
 * ответы, а не урезаны возможности. Прежде «Акцент» и «Кнопки» стояли
 * порознь, и на вопрос «чем красится кнопка» интерфейс отвечал дважды.
 *
 * Порядок объявлен списком и не меняется никогда: мышечная память важнее
 * персональной логики. Раскрыта одна секция; остальные — строки с текущим
 * значением и точкой, если внутри есть отличие от опубликованного.
 */
export const STUDIO_SECTIONS = [
  'style',
  'photos',
  'background',
  'buttons',
  'text',
  'surfaces',
] as const;

export type StudioSection = (typeof STUDIO_SECTIONS)[number];

const SECTION_TITLE: Record<StudioSection, keyof Messages['studio']> = {
  style: 'sectionStyle',
  photos: 'sectionPhotos',
  background: 'sectionBackground',
  buttons: 'sectionButtons',
  text: 'sectionText',
  surfaces: 'sectionSurfaces',
};

/**
 * Какие ручки живут в секции — единственный источник для точки «изменено».
 *
 * Точка у секции это отличие черновика от опубликованного, а не «есть
 * несохранённое»: мастер спрашивает «что увидят клиенты», а не «дошло ли до
 * сервера».
 */
const SECTION_HANDLES: Record<StudioSection, readonly PageDesignHandle[]> = {
  style: ['style', 'motion'],
  photos: ['heroPhoto', 'heroVideo', 'masterPhoto'],
  background: ['background'],
  buttons: ['accent', 'accentTo', 'buttons'],
  text: ['typography', 'ink'],
  surfaces: ['cards', 'border', 'surfaceTint', 'edge'],
};

/** Зона холста → секция инспектора: страница сама является картой настроек (§3.3). */
export const ZONE_TO_SECTION: Record<StudioZone, StudioSection> = {
  heroPhoto: 'photos',
  cards: 'surfaces',
  buttons: 'buttons',
  background: 'background',
};

export function Inspector({
  design,
  published,
  masterName,
  openSection,
  onOpenSection,
  onChange,
  onPreview,
}: {
  design: PageDesign;
  published: PageDesign;
  masterName: string;
  openSection: StudioSection | null;
  onOpenSection: (section: StudioSection | null) => void;
  onChange: (design: PageDesign) => void;
  onPreview: (design: PageDesign | null) => void;
}) {
  const t = useT();

  const changed = useMemo(() => {
    const set = new Set<PageDesignHandle>();
    for (const change of describePageDesignChanges(published, design)) set.add(change.handle);
    return set;
  }, [design, published]);

  const sectionProps = { design, onChange, onPreview };

  /**
   * Набор секций — под выбранную тему, а не общий на все.
   *
   * Мир, у которого нет ни второго материала, ни линеек, не показывает
   * секцию поверхностей вовсе: пустая строка инспектора — обещание выбора,
   * которого нет.
   */
  const sections = STUDIO_SECTIONS.filter(
    (section) => section !== 'surfaces' || hasSurfaceChoices(design),
  );

  function valueOf(section: StudioSection): string | undefined {
    const limits = styleLimits(design.style);
    switch (section) {
      case 'style':
        return hasOverrides(design)
          ? t.studio.styleOverridden.replace('{style}', DESIGN_PRESETS[design.style].name)
          : `${DESIGN_PRESETS[design.style].name} · ${THEME_PRESETS[design.palette].name}`;
      case 'photos': {
        const parts = [
          design.heroPhoto ? t.studio.valueHero : null,
          limits.masterPhoto && design.masterPhoto.shown && design.masterPhoto.media
            ? t.studio.valuePortrait
            : null,
        ].filter(Boolean);
        return parts.length > 0 ? parts.join(' · ') : t.studio.valueNone;
      }
      case 'background':
        return design.background.kind === 'style'
          ? t.studio.backgroundStyle
          : design.background.kind === 'color'
            ? design.background.color
            : t.studio.backgroundImage;
      case 'buttons':
        return `${design.accent ?? t.studio.accentFromStyle} · ${
          t.studio[
            design.buttons.fill === 'solid'
              ? 'buttonSolid'
              : design.buttons.fill === 'outline'
                ? 'buttonOutline'
                : 'buttonSoft'
          ]
        }`;
      case 'text':
        return `${FONT_PRESETS[design.typography.font].name} · ${
          design.ink ?? t.studio.inkFromStyle
        }`;
      case 'surfaces':
        /* Мир, у которого материал один, а тон стекла — ручка, назовёт в
           строке именно тон: имя единственного материала здесь ничего не
           сообщает. */
        if (limits.materials.length === 1 && limits.surfaceTint) {
          return design.surfaceTint ?? t.studio.surfaceTintFromStyle;
        }
        /* Мир, у которого материал один, а ручка — вес контура, назовёт в
           строке именно вес. */
        if (limits.materials.length === 1 && limits.edgeWeight) {
          return t.studio[
            design.edge.weight === 'hairline'
              ? 'edgeWeightHairline'
              : design.edge.weight === 'heavy'
                ? 'edgeWeightHeavy'
                : 'edgeWeightStyle'
          ];
        }
        return t.studio[
          design.cards.material === 'style'
            ? 'materialStyle'
            : design.cards.material === 'flat'
              ? 'materialFlat'
              : design.cards.material === 'rule'
                ? 'materialRule'
                : design.cards.material === 'shadow'
                  ? 'materialShadow'
                  : 'materialGlass'
        ];
      default:
        return undefined;
    }
  }

  function body(section: StudioSection) {
    switch (section) {
      case 'style':
        return <StyleSection {...sectionProps} />;
      case 'photos':
        return <PhotosSection design={design} onChange={onChange} />;
      case 'background':
        return <BackgroundSection {...sectionProps} />;
      case 'buttons':
        return <ButtonsSection {...sectionProps} />;
      case 'text':
        return <TextSection {...sectionProps} masterName={masterName} />;
      case 'surfaces':
        return <SurfacesSection {...sectionProps} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col">
      {sections.map((section) => (
        <SectionShell
          key={section}
          title={t.studio[SECTION_TITLE[section]]}
          value={valueOf(section)}
          changed={SECTION_HANDLES[section].some((handle) => changed.has(handle))}
          open={openSection === section}
          onToggle={() => onOpenSection(openSection === section ? null : section)}
        >
          {body(section)}
        </SectionShell>
      ))}
    </div>
  );
}
