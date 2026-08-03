ALTER TABLE "organizations" ALTER COLUMN "theme_preset_key" SET DEFAULT 'riga-poster';--> statement-breakpoint
ALTER TABLE "organizations" ALTER COLUMN "font_preset_key" SET DEFAULT 'onest-unbounded';--> statement-breakpoint
-- Remap stored preset keys onto the redesigned set. The old keys were built
-- for a frosted-glass world and no longer exist; without this every master
-- silently falls back to the default and the appearance editor shows an empty
-- selection for a choice she actually made.
UPDATE "organizations" SET "theme_preset_key" = CASE "theme_preset_key"
  WHEN 'noir-gold'       THEN 'melns'
  WHEN 'deep-petrol'     THEN 'melns'
  WHEN 'sage-studio'     THEN 'zalais'
  WHEN 'mocha-cream'     THEN 'papirs'
  WHEN 'terracotta-clay' THEN 'okers'
  ELSE 'riga-poster'
END
WHERE "theme_preset_key" NOT IN ('riga-poster', 'papirs', 'zalais', 'melns', 'okers');
--> statement-breakpoint
UPDATE "organizations" SET "font_preset_key" = CASE "font_preset_key"
  WHEN 'manrope'              THEN 'manrope-jost'
  WHEN 'nunito'               THEN 'manrope-jost'
  WHEN 'cormorant'            THEN 'commissioner-spectral'
  WHEN 'inter-playfair'       THEN 'commissioner-spectral'
  WHEN 'montserrat-cormorant' THEN 'commissioner-montserrat'
  ELSE 'onest-unbounded'
END
WHERE "font_preset_key" NOT IN ('onest-unbounded', 'golos', 'manrope-jost',
                                'commissioner-montserrat', 'jost', 'commissioner-spectral');
