ALTER TABLE "bookings" ADD COLUMN "guest_instagram" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "instagram_handle" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "is_blocked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "auto_confirm_bookings" boolean DEFAULT false NOT NULL;