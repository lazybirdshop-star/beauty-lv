CREATE TYPE "public"."service_price_type" AS ENUM('fixed', 'from');--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"price_amount" integer NOT NULL,
	"price_currency" text DEFAULT 'EUR' NOT NULL,
	"price_type" "service_price_type" DEFAULT 'fixed' NOT NULL,
	"color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;