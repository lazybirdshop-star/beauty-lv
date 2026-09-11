-- Журнал действий заведения в настройках кабинета: записи одной организации,
-- новыми сверху. Существующие индексы журнала — по времени на всю платформу и
-- по сущности; без этого каждая страница журнала салона читала бы весь журнал
-- платформы.
CREATE INDEX IF NOT EXISTS "audit_log_organization_id_created_at_idx" ON "audit_log" USING btree ("organization_id","created_at" DESC);
