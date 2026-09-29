-- The companies table was dropped in 20260917183303_remove_company_module and then
-- re-added to schema.prisma without a migration. Any database provisioned from
-- migrations alone has no companies table, which breaks product create/update and
-- every /api/companies endpoint.
--
-- Written defensively with IF NOT EXISTS because local dev databases already have the
-- table from `prisma db push`.

-- CreateTable
CREATE TABLE IF NOT EXISTS "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "companies_name_key" ON "companies"("name");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'products_company_id_fkey'
    ) THEN
        ALTER TABLE "products"
            ADD CONSTRAINT "products_company_id_fkey"
            FOREIGN KEY ("company_id") REFERENCES "companies"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
