CREATE TYPE "public"."booking_source" AS ENUM('public_page', 'admin_manual', 'marketplace');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'completed', 'cancelled_by_client', 'cancelled_by_master', 'no_show');--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_name_snapshot" text NOT NULL,
	"duration_minutes_snapshot" integer NOT NULL,
	"price_amount_snapshot" integer NOT NULL,
	"price_currency_snapshot" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"organization_member_id" uuid NOT NULL,
	"published_slot_id" uuid NOT NULL,
	"client_user_id" uuid,
	"guest_name" text,
	"guest_phone" text,
	"guest_email" text,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"cancellation_reason" text,
	"source" "booking_source" NOT NULL,
	"idempotency_key" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "bookings_published_slot_id_unique" UNIQUE("published_slot_id"),
	CONSTRAINT "bookings_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_published_slot_id_published_slots_id_fk" FOREIGN KEY ("published_slot_id") REFERENCES "public"."published_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_client_user_id_users_id_fk" FOREIGN KEY ("client_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;