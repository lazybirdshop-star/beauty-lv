CREATE TYPE "public"."user_account_status" AS ENUM('active', 'blocked');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" "user_account_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "sms_reminders_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_reminders_enabled" boolean DEFAULT true NOT NULL;