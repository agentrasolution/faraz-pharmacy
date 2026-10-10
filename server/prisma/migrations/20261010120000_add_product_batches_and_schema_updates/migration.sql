-- Migration: 20261010120000_add_product_batches_and_schema_updates
--
-- This migration introduces:
-- 1. The complete product batches system (product_batches table, unique constraints, indices, foreign keys)
-- 2. Batch linkage fields on sale_items (batch_id, batch_number, expiry)
-- 3. Batch linkage fields on stock_purchases (batch_id, batch_number)
-- 4. Tax field on sales table
-- 5. Defensive check for products.company_id
-- 6. Soft-delete active flags on customers, categories, distributors, expenses, and companies
--
-- Written defensively with IF NOT EXISTS to guarantee safe execution on both fresh databases
-- and existing databases that were partially synchronized with `prisma db push`.

-- 1. Ensure company_id exists on products before foreign key check
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "company_id" TEXT;

-- 2. Create product_batches table
CREATE TABLE IF NOT EXISTS "product_batches" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expiry_date" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "initial_qty" INTEGER NOT NULL DEFAULT 0,
    "purchase_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sale_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "distributor_id" TEXT,
    "invoice_number" TEXT,
    "active" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_batches_pkey" PRIMARY KEY ("id")
);

-- 3. Indices & Unique Constraints for product_batches
CREATE UNIQUE INDEX IF NOT EXISTS "product_batches_product_id_batch_number_key" ON "product_batches"("product_id", "batch_number");
CREATE INDEX IF NOT EXISTS "product_batches_product_id_expiry_date_idx" ON "product_batches"("product_id", "expiry_date");
CREATE INDEX IF NOT EXISTS "product_batches_batch_number_idx" ON "product_batches"("batch_number");

-- 4. Foreign Keys for product_batches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_batches_product_id_fkey'
    ) THEN
        ALTER TABLE "product_batches"
            ADD CONSTRAINT "product_batches_product_id_fkey"
            FOREIGN KEY ("product_id") REFERENCES "products"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'product_batches_distributor_id_fkey'
    ) THEN
        ALTER TABLE "product_batches"
            ADD CONSTRAINT "product_batches_distributor_id_fkey"
            FOREIGN KEY ("distributor_id") REFERENCES "distributors"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Batch columns and foreign key on sale_items
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "batch_number" TEXT;
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "expiry" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_batch_id_fkey'
    ) THEN
        ALTER TABLE "sale_items"
            ADD CONSTRAINT "sale_items_batch_id_fkey"
            FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 6. Batch columns and foreign key on stock_purchases
ALTER TABLE "stock_purchases" ADD COLUMN IF NOT EXISTS "batch_id" TEXT;
ALTER TABLE "stock_purchases" ADD COLUMN IF NOT EXISTS "batch_number" TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'stock_purchases_batch_id_fkey'
    ) THEN
        ALTER TABLE "stock_purchases"
            ADD CONSTRAINT "stock_purchases_batch_id_fkey"
            FOREIGN KEY ("batch_id") REFERENCES "product_batches"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 7. Tax column on sales
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "tax" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 8. Soft-delete active flags across models
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "active" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "active" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "distributors" ADD COLUMN IF NOT EXISTS "active" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "active" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "active" INTEGER NOT NULL DEFAULT 1;
