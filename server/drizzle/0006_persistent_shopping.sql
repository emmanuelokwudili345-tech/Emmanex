CREATE TABLE IF NOT EXISTS "shopping_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cart_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "session_id" uuid REFERENCES "shopping_sessions"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "quantity" integer DEFAULT 1 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "cart_items_quantity_positive" CHECK ("quantity" > 0),
  CONSTRAINT "cart_items_owner_check" CHECK (("user_id" IS NOT NULL AND "session_id" IS NULL) OR ("user_id" IS NULL AND "session_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_user_product_unique" ON "cart_items" USING btree ("user_id", "product_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cart_items_session_product_unique" ON "cart_items" USING btree ("session_id", "product_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wishlist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wishlist_items_user_product_unique" ON "wishlist_items" USING btree ("user_id", "product_id");
