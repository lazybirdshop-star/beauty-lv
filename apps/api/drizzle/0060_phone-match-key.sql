-- Хвост телефона становится колонкой.
--
-- «Тот же ли это человек» решается сравнением последних восьми цифр: местный
-- номер и международный иначе не узнают друг друга. До сих пор хвост считался
-- прямо в запросе — `right(regexp_replace(phone, '\D', '', 'g'), 8)` — по обе
-- стороны сравнения. Выражение индексом не берётся ни при каких условиях, а
-- длина хвоста к тому же уезжает в запрос связанным параметром, из-за чего
-- даже индекс по выражению планировщик сопоставить бы не смог.
--
-- Считает хвост теперь база, один раз при записи. Колонка вычисляемая и
-- хранимая: разойтись с номером она не может по определению, обновлять её
-- некому и незачем, а сравнение из выражения превращается в равенство
-- обычных колонок — то есть в индексный проход.
--
-- Длина 8 — `PHONE_MATCH_DIGITS` из общего ядра. Короче восьми номер
-- сравнивается целиком: `right()` на короткой строке возвращает её всю, ровно
-- как `phoneMatchKey` в TypeScript.
ALTER TABLE "bookings" ADD COLUMN "guest_phone_match_key" text
  GENERATED ALWAYS AS (right(regexp_replace(coalesce("guest_phone", ''), '\D', '', 'g'), 8)) STORED;--> statement-breakpoint

ALTER TABLE "clients" ADD COLUMN "phone_match_key" text
  GENERATED ALWAYS AS (right(regexp_replace("phone", '\D', '', 'g'), 8)) STORED;--> statement-breakpoint

-- Оба вопроса задаются внутри одной организации: «есть ли у этого клиента
-- визит» на каждом открытии адресной книги и «не заблокирован ли этот номер»
-- на каждой гостевой записи.
CREATE INDEX IF NOT EXISTS "bookings_organization_id_guest_phone_match_key_idx"
  ON "bookings" USING btree ("organization_id","guest_phone_match_key");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "clients_organization_id_phone_match_key_idx"
  ON "clients" USING btree ("organization_id","phone_match_key");
