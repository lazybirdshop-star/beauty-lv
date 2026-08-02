CREATE TABLE "booking_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"published_slot_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_slots" ADD CONSTRAINT "booking_slots_published_slot_id_published_slots_id_fk" FOREIGN KEY ("published_slot_id") REFERENCES "public"."published_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_slots_active_published_slot_unique" ON "booking_slots" USING btree ("published_slot_id") WHERE "booking_slots"."released_at" is null;--> statement-breakpoint
-- Backfill: every existing booking already occupies its starting window.
-- Without this an old booking would have no occupancy rows at all, and
-- cancelling it would release nothing. Cancelled bookings are backfilled as
-- already-released so they neither hold a window nor trip the partial
-- unique index.
INSERT INTO "booking_slots" ("booking_id", "published_slot_id", "created_at", "released_at")
SELECT
  b."id",
  b."published_slot_id",
  b."created_at",
  CASE
    WHEN b."status" IN ('cancelled_by_client', 'cancelled_by_master') THEN b."updated_at"
    ELSE NULL
  END
FROM "bookings" b;
