ALTER TABLE "organizations" ADD COLUMN "address_line" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "instagram_handle" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "show_prices_section" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "show_contacts_section" boolean DEFAULT true NOT NULL;