ALTER TABLE "organizations" ADD COLUMN "theme_preset_key" text DEFAULT 'blush-rose' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "font_preset_key" text DEFAULT 'onest' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "theme_overrides" jsonb;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "hero_style" text DEFAULT 'gradient' NOT NULL;