-- Кто из мастеров оказывает эту услугу (SALON.md §4.4, SL-5).
--
-- До этой таблицы связи между человеком и услугой не было вовсе: гость мог
-- выбрать окно барбера и услугу «наращивание ресниц», и запись принималась.
CREATE TABLE "staff_services" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_member_id" uuid NOT NULL,
  "service_id" uuid NOT NULL,
  "price_override_amount" integer,
  "duration_override_minutes" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "staff_services_member_service_unique" ON "staff_services" ("organization_member_id","service_id");
--> statement-breakpoint
-- «Кто оказывает услугу» спрашивают с двух сторон: страница услуги перечисляет
-- мастеров, страница мастера — услуги. Второй индекс — под второй вопрос.
CREATE INDEX "staff_services_service_idx" ON "staff_services" ("service_id");
--> statement-breakpoint
-- Засев в той же миграции, и это условие безопасности, а не удобство.
--
-- В момент, когда бронирование начнёт проверять «мастер оказывает эту услугу»,
-- организация без строк здесь перестанет принимать записи вообще. Декартово
-- произведение «каждый живой участник × каждая услуга его организации» — ровно
-- то поведение, которое было до этой миграции: прайс принадлежал организации и
-- описывал всех.
--
-- Отстранённые не засеваются: они не работают, и строки за ними — приглашение
-- забыть об этом при возврате. Возврат в строй строки заводит заново.
INSERT INTO "staff_services" ("organization_member_id", "service_id")
SELECT m."id", s."id"
FROM "organization_members" m
JOIN "services" s ON s."organization_id" = m."organization_id"
WHERE m."deleted_at" IS NULL
  AND m."status" <> 'disabled'
  AND s."deleted_at" IS NULL
ON CONFLICT DO NOTHING;
