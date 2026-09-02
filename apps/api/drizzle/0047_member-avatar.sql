ALTER TABLE "organization_members" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "organization_members" ADD COLUMN "avatar_focal" jsonb;--> statement-breakpoint
-- Портрет переезжает от макета к человеку.
--
-- Источник — опубликованный дизайн (`page_design`), а не черновик: на витрине
-- сейчас стоит именно он, и перенести нужно то, что клиент видит. Если Студии
-- в организации ещё не было, снимок берётся из прежней колонки `logo_url` —
-- до Студии портрет жил только там.
--
-- Фокус едет вместе со своим снимком и только с ним: взять точку кадрирования
-- от одной фотографии и приложить её к другой значит обрезать лицо по чужой
-- мерке. Пустой фокус читается как центр (`CENTER_FOCAL`).
--
-- Получатель — владелец организации: сегодня это единственный участник, и
-- именно его лицо стоит на странице. Приглашённые сотрудники появятся с SL-3 и
-- принесут свои фотографии сами.
UPDATE "organization_members" AS m
SET "avatar_url" = COALESCE(
      NULLIF(o."page_design" #>> '{masterPhoto,media,url}', ''),
      NULLIF(o."logo_url", '')
    ),
    "avatar_focal" = CASE
      WHEN NULLIF(o."page_design" #>> '{masterPhoto,media,url}', '') IS NOT NULL
        THEN o."page_design" #> '{masterPhoto,media,focal}'
      ELSE NULL
    END
FROM "organizations" AS o
WHERE m."organization_id" = o."id"
  AND m."role" = 'owner'
  AND m."deleted_at" IS NULL
  AND COALESCE(
        NULLIF(o."page_design" #>> '{masterPhoto,media,url}', ''),
        NULLIF(o."logo_url", '')
      ) IS NOT NULL;
