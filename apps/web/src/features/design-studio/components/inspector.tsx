'use client';

import {
  DESIGN_PRESETS,
  describePageDesignChanges,
  FONT_PRESETS,
  THEME_PRESETS,
  type PageDesign,
  type PageDesignHandle,
} from '@amolie/shared-kernel';
import { useMemo } from 'react';

import { useT, type Messages } from '@/lib/i18n';

import type { StudioZone } from '../preview-bridge';

import { AccentSection } from './sections/accent-section';
import { BackgroundSection } from './sections/background-section';
import { HeroPhotoSection, HeroVideoSection, MasterPhotoSection } from './sections/media-sections';
import { SectionShell } from './sections/section-shell';
import { StyleSection, hasOverrides } from './sections/style-section';
import {
  ButtonsSection,
  CardsSection,
  MotionSection,
  TypographySection,
} from './sections/surface-sections';

/**
 * Десять секций в фиксированном порядке — от идентичности к деталям
 * (DESIGN_STUDIO.md §3.2).
 *
 * Порядок объявлен списком и не меняется никогда: мышечная память важнее
 * персональной логики. Раскрыта одна секция; остальные — строки с текущим
 * значением и точкой, если внутри есть отличие от опубликованного.
 */
const SECTION_ORDER: PageDesignHandle[] = [
  'style',
  'accent',
  'heroPhoto',
  'heroVideo',
  'background',
  'masterPhoto',
  'buttons',
  'cards',
  'typography',
  'motion',
];

const SECTION_TITLE: Record<PageDesignHandle, keyof Messages['studio']> = {
  style: 'sectionStyle',
  accent: 'sectionAccent',
  heroPhoto: 'sectionHeroPhoto',
  heroVideo: 'sectionHeroVideo',
  background: 'sectionBackground',
  masterPhoto: 'sectionMasterPhoto',
  buttons: 'sectionButtons',
  cards: 'sectionCards',
  typography: 'sectionType',
  motion: 'sectionMotion',
};

/** Зона холста → секция инспектора: страница сама является картой настроек (§3.3). */
export const ZONE_TO_SECTION: Record<StudioZone, PageDesignHandle> = {
  heroPhoto: 'heroPhoto',
  cards: 'cards',
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
  openSection: PageDesignHandle | null;
  onOpenSection: (section: PageDesignHandle | null) => void;
  onChange: (design: PageDesign) => void;
  onPreview: (design: PageDesign | null) => void;
}) {
  const t = useT();

  /* Точка у секции — это отличие черновика от опубликованного, а не «есть
     несохранённое»: мастер спрашивает «что увидят клиенты», а не «дошло ли
     до сервера». */
  const changed = useMemo(() => {
    const set = new Set<PageDesignHandle>();
    for (const change of describePageDesignChanges(published, design)) set.add(change.handle);
    return set;
  }, [design, published]);

  const sectionProps = { design, onChange, onPreview };

  function valueOf(handle: PageDesignHandle): string | undefined {
    switch (handle) {
      case 'style':
        return hasOverrides(design)
          ? t.studio.styleOverridden.replace('{style}', DESIGN_PRESETS[design.style].name)
          : `${DESIGN_PRESETS[design.style].name} · ${THEME_PRESETS[design.palette].name}`;
      case 'accent':
        return design.accent ?? t.studio.accentFromStyle;
      case 'heroPhoto':
        return design.heroPhoto ? design.heroPhoto.url : t.studio.valueNone;
      case 'heroVideo':
        return design.heroVideo ? design.heroVideo.url : t.studio.valueNone;
      case 'background':
        return design.background.kind === 'style'
          ? t.studio.backgroundStyle
          : design.background.kind === 'color'
            ? design.background.color
            : t.studio.backgroundImage;
      case 'masterPhoto':
        return design.masterPhoto.shown ? t.studio.valueDefault : t.studio.valueNone;
      case 'buttons':
        return t.studio[
          design.buttons.fill === 'solid'
            ? 'buttonSolid'
            : design.buttons.fill === 'outline'
              ? 'buttonOutline'
              : 'buttonSoft'
        ];
      case 'cards':
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
      case 'typography':
        return FONT_PRESETS[design.typography.font].name;
      case 'motion':
        return t.studio[
          design.motion.step === 'restrained'
            ? 'motionRestrained'
            : design.motion.step === 'live'
              ? 'motionLive'
              : 'motionCeremonial'
        ];
      default:
        return undefined;
    }
  }

  function body(handle: PageDesignHandle) {
    switch (handle) {
      case 'style':
        return <StyleSection {...sectionProps} />;
      case 'accent':
        return <AccentSection {...sectionProps} />;
      case 'heroPhoto':
        return <HeroPhotoSection design={design} onChange={onChange} />;
      case 'heroVideo':
        return <HeroVideoSection design={design} onChange={onChange} />;
      case 'background':
        return <BackgroundSection {...sectionProps} />;
      case 'masterPhoto':
        return <MasterPhotoSection design={design} onChange={onChange} />;
      case 'buttons':
        return <ButtonsSection {...sectionProps} />;
      case 'cards':
        return <CardsSection {...sectionProps} />;
      case 'typography':
        return <TypographySection {...sectionProps} masterName={masterName} />;
      case 'motion':
        return <MotionSection {...sectionProps} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col">
      {SECTION_ORDER.map((handle) => (
        <SectionShell
          key={handle}
          title={t.studio[SECTION_TITLE[handle]]}
          value={valueOf(handle)}
          changed={changed.has(handle)}
          open={openSection === handle}
          onToggle={() => onOpenSection(openSection === handle ? null : handle)}
        >
          {body(handle)}
        </SectionShell>
      ))}
    </div>
  );
}
