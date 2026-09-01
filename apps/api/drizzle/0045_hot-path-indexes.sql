CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_entity_id_created_at_idx" ON "audit_log" USING btree ("entity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "booking_slots_active_booking_id_idx" ON "booking_slots" USING btree ("booking_id") WHERE "booking_slots"."released_at" is null;--> statement-breakpoint
CREATE INDEX "booking_items_booking_id_idx" ON "booking_items" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "bookings_organization_id_status_idx" ON "bookings" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "published_slots_starts_at_idx" ON "published_slots" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "jobs_running_started_at_idx" ON "jobs" USING btree ("started_at") WHERE "jobs"."status" = 'running';