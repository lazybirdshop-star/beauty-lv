-- Час визита переезжает в саму запись.
--
-- Время живёт в `published_slots.starts_at`, и каждый вопрос «что у салона за
-- эти сутки» накладывал отрезок на присоединённую таблицу. У `bookings` нет
-- ни колонки со временем, ни обычного индекса на `published_slot_id` — только
-- два частичных, — поэтому планировщику оставался один путь: пройти
-- `bookings_organization_id_status_idx` по всей истории организации и
-- отфильтровать по времени уже после join. Главная кабинета делает это трижды
-- на открытие, «Финансы» — шесть раз, ресепшен — раз в минуту всю смену.
ALTER TABLE "bookings" ADD COLUMN "starts_at" timestamp with time zone;--> statement-breakpoint

UPDATE "bookings" SET "starts_at" = "published_slots"."starts_at"
FROM "published_slots" WHERE "published_slots"."id" = "bookings"."published_slot_id";--> statement-breakpoint

/*
 * Копию заполняет база, а не только приложение.
 *
 * Две причины, и обе обязательные. Первая — выкат: `release_command` во Fly
 * применяет миграцию до того, как поедут новые машины, и в этот промежуток
 * работающий старый код вставляет записи без новой колонки. Без триггера
 * `NOT NULL` уронил бы ровно гостевую запись — то единственное, что продукт
 * не имеет права терять ни на секунду.
 *
 * Вторая — расхождение. Копия часа визита врёт молча: в календаре визит в
 * одном часе, в списке в другом, и заметит это клиент, а не мастер. Пока
 * заполнение живёт в приложении, оно держится на том, что ни один будущий
 * путь записи не забудет про колонку. Здесь оно держится на самой таблице.
 */
CREATE OR REPLACE FUNCTION bookings_sync_starts_at() RETURNS trigger AS $$
BEGIN
  SELECT starts_at INTO NEW.starts_at FROM published_slots WHERE id = NEW.published_slot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER bookings_starts_at_sync
BEFORE INSERT OR UPDATE OF published_slot_id ON bookings
FOR EACH ROW EXECUTE FUNCTION bookings_sync_starts_at();--> statement-breakpoint

/*
 * Обратная сторона: окно переехало во времени — переезжают и его записи.
 *
 * Сегодня этого не случается (`rescheduleAvailable` двигает только окна со
 * статусом `available`, то есть незанятые), и триггер ни разу не сработает.
 * Он стоит здесь не ради сегодняшнего поведения, а ради того, чтобы завтрашняя
 * правка планировщика не породила расхождение, которого никто не заметит.
 */
CREATE OR REPLACE FUNCTION published_slots_sync_booking_starts_at() RETURNS trigger AS $$
BEGIN
  UPDATE bookings SET starts_at = NEW.starts_at WHERE published_slot_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER published_slots_starts_at_cascade
AFTER UPDATE OF starts_at ON published_slots
FOR EACH ROW WHEN (OLD.starts_at IS DISTINCT FROM NEW.starts_at)
EXECUTE FUNCTION published_slots_sync_booking_starts_at();--> statement-breakpoint

ALTER TABLE "bookings" ALTER COLUMN "starts_at" SET NOT NULL;--> statement-breakpoint

-- Тот же порядок колонок, что у `bookings_organization_id_status_idx`:
-- организация ведущая, потому что с неё начинается каждый запрос кабинета.
CREATE INDEX IF NOT EXISTS "bookings_organization_id_starts_at_idx" ON "bookings" USING btree ("organization_id","starts_at");--> statement-breakpoint

-- Связь записи с окном читают и в обратную сторону — от окна к записи
-- (`reclaimSlots`, публичная страница). Оба существующих индекса по этой
-- колонке частичные, и запрос без их предиката взять их не может.
CREATE INDEX IF NOT EXISTS "bookings_published_slot_id_idx" ON "bookings" USING btree ("published_slot_id");
