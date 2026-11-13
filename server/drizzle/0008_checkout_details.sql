ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "recipient_email" varchar(255);
--> statement-breakpoint
UPDATE "orders"
SET "recipient_email" = "users"."email"
FROM "users"
WHERE "orders"."user_id" = "users"."id"
  AND "orders"."recipient_email" IS NULL;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "recipient_email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_method" varchar(40) DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_method" varchar(40) DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" varchar(40) DEFAULT 'unknown' NOT NULL;
--> statement-breakpoint
UPDATE "orders"
SET "payment_method" = 'demo',
    "payment_status" = 'simulated'
WHERE "is_demo" = true;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_delivery_method_valid'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_method_valid"
    CHECK ("delivery_method" IN ('standard'));
  END IF;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_payment_method_valid'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_method_valid"
    CHECK ("payment_method" IN ('unknown', 'demo'));
  END IF;
END;
$$;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'orders_payment_status_valid'
      AND conrelid = 'public.orders'::regclass
  ) THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_payment_status_valid"
    CHECK ("payment_status" IN ('unknown', 'simulated'));
  END IF;
END;
$$;
