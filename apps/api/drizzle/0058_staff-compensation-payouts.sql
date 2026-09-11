CREATE TYPE "public"."compensation_type" AS ENUM('percent', 'chair_rent', 'salary_plus_percent');--> statement-breakpoint
CREATE TYPE "public"."rent_period" AS ENUM('day', 'week', 'month');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('draft', 'approved', 'paid');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "staff_compensation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"organization_member_id" uuid NOT NULL,
	"type" "compensation_type" NOT NULL,
	"percent_bps" integer,
	"rent_amount" integer,
	"rent_period" "rent_period",
	"salary_amount" integer,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"effective_from" date NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_compensation_percent_range" CHECK ("percent_bps" IS NULL OR ("percent_bps" >= 0 AND "percent_bps" <= 10000)),
	CONSTRAINT "staff_compensation_amounts_non_negative" CHECK (coalesce("rent_amount", 0) >= 0 AND coalesce("salary_amount", 0) >= 0),
	CONSTRAINT "staff_compensation_shape" CHECK (
		("type" = 'percent' AND "percent_bps" IS NOT NULL AND "rent_amount" IS NULL AND "rent_period" IS NULL AND "salary_amount" IS NULL)
		OR ("type" = 'chair_rent' AND "rent_amount" IS NOT NULL AND "rent_period" IS NOT NULL AND "percent_bps" IS NULL AND "salary_amount" IS NULL)
		OR ("type" = 'salary_plus_percent' AND "salary_amount" IS NOT NULL AND "percent_bps" IS NOT NULL AND "rent_amount" IS NULL AND "rent_period" IS NULL)
	)
);
--> statement-breakpoint
ALTER TABLE "staff_compensation" ADD CONSTRAINT "staff_compensation_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_compensation" ADD CONSTRAINT "staff_compensation_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_compensation" ADD CONSTRAINT "staff_compensation_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_compensation_member_effective_idx" ON "staff_compensation" USING btree ("organization_member_id","effective_from");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "staff_compensation_organization_idx" ON "staff_compensation" USING btree ("organization_id");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"organization_member_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"revenue_amount" integer NOT NULL,
	"bookings_count" integer NOT NULL,
	"master_amount" integer NOT NULL,
	"salon_amount" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"status" "payout_status" DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"paid_by_user_id" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_period_order" CHECK ("period_end" >= "period_start")
);
--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_organization_member_id_organization_members_id_fk" FOREIGN KEY ("organization_member_id") REFERENCES "public"."organization_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payouts_member_period_unique" ON "payouts" USING btree ("organization_member_id","period_start","period_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_organization_period_idx" ON "payouts" USING btree ("organization_id","period_start");
