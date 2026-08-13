/*
 * Снятые миры уходят из данных, а не только из кода.
 *
 * Пять ключей оформления (`soft-studio`, `editorial`, `minimal`, `organic`,
 * `neo-glass`) вместе со своими палитрами и тремя парами гарнитур
 * (`onest-playfair`, `inter`, `golos-nunito`) больше не существуют. Резолвер
 * страницы падает на умолчание для любого неизвестного ключа, поэтому
 * страницы мастеров не ломаются и без миграции — но строка, которая говорит
 * одно, а рисуется другим, это второй источник истины: кабинет показал бы
 * мастеру мир, которого нет, а откат версии в Студии восстановил бы решение,
 * которое нечем нарисовать.
 *
 * Данные приводятся ровно к тому, что уже видит посетитель: снятый мир — к
 * умолчанию продукта (`soft`), а осиротевшая палитра или пара — к авторскому
 * умолчанию того мира, в котором строка осталась.
 */

/* ── Прежние поля редактора ──────────────────────────────────────────── */

UPDATE "organizations"
SET "design_preset_key" = 'soft',
    "theme_preset_key" = 'blush-rose',
    "font_preset_key" = 'onest'
WHERE "design_preset_key" IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

UPDATE "organizations"
SET "theme_preset_key" = CASE "design_preset_key"
      WHEN 'luxury' THEN 'luxury'
      WHEN 'poster' THEN 'riga-poster'
      WHEN 'aura' THEN 'aura-pearl'
      WHEN 'funk' THEN 'funk-blueprint'
      ELSE 'blush-rose'
    END
WHERE "theme_preset_key" IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

UPDATE "organizations"
SET "font_preset_key" = CASE "design_preset_key"
      WHEN 'luxury' THEN 'jost-cormorant'
      WHEN 'poster' THEN 'onest-unbounded'
      WHEN 'aura' THEN 'aura-onest'
      WHEN 'funk' THEN 'funk-inter-tight'
      ELSE 'onest'
    END
WHERE "font_preset_key" IN ('onest-playfair', 'inter', 'golos-nunito');
--> statement-breakpoint

/* ── Решения Студии: опубликованное, черновик и история версий ───────── */

UPDATE "organizations"
SET "page_design" = jsonb_set(
      jsonb_set(
        jsonb_set("page_design", '{style}', '"soft"'),
        '{palette}', '"blush-rose"'
      ),
      '{typography,font}', '"onest"'
    )
WHERE "page_design" IS NOT NULL
  AND "page_design" ->> 'style' IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

UPDATE "organizations"
SET "page_design_draft" = jsonb_set(
      jsonb_set(
        jsonb_set("page_design_draft", '{style}', '"soft"'),
        '{palette}', '"blush-rose"'
      ),
      '{typography,font}', '"onest"'
    )
WHERE "page_design_draft" IS NOT NULL
  AND "page_design_draft" ->> 'style' IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

/* История правится вместе с остальным намеренно: откат обязан вернуть мир,
   который существует, иначе кнопка «вернуть версию» обещает то, чего нет. */
UPDATE "page_design_versions"
SET "design" = jsonb_set(
      jsonb_set(
        jsonb_set("design", '{style}', '"soft"'),
        '{palette}', '"blush-rose"'
      ),
      '{typography,font}', '"onest"'
    )
WHERE "design" ->> 'style' IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

/* Осиротевшая палитра или пара при живом мире — тот же случай, только на
   одну ось: мир остаётся, а его прочтение возвращается к авторскому. */
UPDATE "organizations"
SET "page_design" = jsonb_set("page_design", '{palette}', to_jsonb(CASE "page_design" ->> 'style'
      WHEN 'luxury' THEN 'luxury'
      WHEN 'poster' THEN 'riga-poster'
      WHEN 'aura' THEN 'aura-pearl'
      WHEN 'funk' THEN 'funk-blueprint'
      ELSE 'blush-rose'
    END))
WHERE "page_design" IS NOT NULL
  AND "page_design" ->> 'palette' IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

UPDATE "organizations"
SET "page_design_draft" = jsonb_set("page_design_draft", '{palette}', to_jsonb(CASE "page_design_draft" ->> 'style'
      WHEN 'luxury' THEN 'luxury'
      WHEN 'poster' THEN 'riga-poster'
      WHEN 'aura' THEN 'aura-pearl'
      WHEN 'funk' THEN 'funk-blueprint'
      ELSE 'blush-rose'
    END))
WHERE "page_design_draft" IS NOT NULL
  AND "page_design_draft" ->> 'palette' IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

UPDATE "page_design_versions"
SET "design" = jsonb_set("design", '{palette}', to_jsonb(CASE "design" ->> 'style'
      WHEN 'luxury' THEN 'luxury'
      WHEN 'poster' THEN 'riga-poster'
      WHEN 'aura' THEN 'aura-pearl'
      WHEN 'funk' THEN 'funk-blueprint'
      ELSE 'blush-rose'
    END))
WHERE "design" ->> 'palette' IN ('soft-studio', 'editorial', 'minimal', 'organic', 'neo-glass');
--> statement-breakpoint

UPDATE "organizations"
SET "page_design" = jsonb_set("page_design", '{typography,font}', to_jsonb(CASE "page_design" ->> 'style'
      WHEN 'luxury' THEN 'jost-cormorant'
      WHEN 'poster' THEN 'onest-unbounded'
      WHEN 'aura' THEN 'aura-onest'
      WHEN 'funk' THEN 'funk-inter-tight'
      ELSE 'onest'
    END))
WHERE "page_design" IS NOT NULL
  AND "page_design" #>> '{typography,font}' IN ('onest-playfair', 'inter', 'golos-nunito');
--> statement-breakpoint

UPDATE "organizations"
SET "page_design_draft" = jsonb_set("page_design_draft", '{typography,font}', to_jsonb(CASE "page_design_draft" ->> 'style'
      WHEN 'luxury' THEN 'jost-cormorant'
      WHEN 'poster' THEN 'onest-unbounded'
      WHEN 'aura' THEN 'aura-onest'
      WHEN 'funk' THEN 'funk-inter-tight'
      ELSE 'onest'
    END))
WHERE "page_design_draft" IS NOT NULL
  AND "page_design_draft" #>> '{typography,font}' IN ('onest-playfair', 'inter', 'golos-nunito');
--> statement-breakpoint

UPDATE "page_design_versions"
SET "design" = jsonb_set("design", '{typography,font}', to_jsonb(CASE "design" ->> 'style'
      WHEN 'luxury' THEN 'jost-cormorant'
      WHEN 'poster' THEN 'onest-unbounded'
      WHEN 'aura' THEN 'aura-onest'
      WHEN 'funk' THEN 'funk-inter-tight'
      ELSE 'onest'
    END))
WHERE "design" #>> '{typography,font}' IN ('onest-playfair', 'inter', 'golos-nunito');
