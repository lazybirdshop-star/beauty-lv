ALTER TYPE "public"."user_token_purpose" ADD VALUE 'client_sign_in';--> statement-breakpoint
ALTER TABLE "user_tokens" ADD COLUMN "booking_id" uuid;--> statement-breakpoint
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_client_user_id_idx" ON "bookings" USING btree ("client_user_id");