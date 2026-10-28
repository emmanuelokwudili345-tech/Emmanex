ALTER TABLE "users" ADD COLUMN "neon_auth_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_neon_auth_user_id_unique" UNIQUE("neon_auth_user_id");