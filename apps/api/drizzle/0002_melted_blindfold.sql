CREATE TYPE "public"."published_slot_status" AS ENUM('available', 'booked');--> statement-breakpoint
CREATE TABLE "published_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_member_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" "published_slot_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "published_slots" ADD CONSTRAINT "published_slots_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "published_slots_member_starts_at_unique" ON "published_slots" USING btree ("organization_member_id","starts_at");