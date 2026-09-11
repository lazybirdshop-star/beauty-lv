-- Лента «Что нового» кабинета спрашивает записи организации, изменённые за
-- последние две недели. Индекс по (organization_id, status) это время не
-- сужает: салон с годами истории читал бы все свои записи на каждый опрос
-- колокольчика. updated_at только растёт, поэтому он — точный предфильтр и для
-- новых записей, и для отмен.
CREATE INDEX IF NOT EXISTS "bookings_organization_id_updated_at_idx" ON "bookings" USING btree ("organization_id","updated_at");
