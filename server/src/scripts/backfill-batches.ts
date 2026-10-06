import "dotenv/config";
import { prisma } from "../services/prisma";

async function run() {
  console.log("Starting batch backfill for existing products...");
  const products = await prisma.product.findMany({
    include: {
      batches: true,
      stockPurchases: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let createdCount = 0;

  for (const product of products) {
    if (product.batches.length === 0) {
      const latestPurchase = product.stockPurchases[0];
      const batchNo = latestPurchase?.invoiceNumber 
        ? `LOT-${latestPurchase.invoiceNumber.replace(/\s+/g, "").slice(0, 10)}`
        : `INIT-${product.barcode ? product.barcode.slice(-4) : "001"}`;
      
      const expiry = product.expiry || latestPurchase?.expiry || "2028-12-31";
      const qty = Math.max(0, product.stockQty);

      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: batchNo,
          expiryDate: expiry,
          quantity: qty,
          initialQty: qty,
          purchasePrice: product.purchasePrice || latestPurchase?.purchasePrice || 0,
          salePrice: product.salePrice || latestPurchase?.salePrice || 0,
          distributorId: product.distributorId || latestPurchase?.distributorId || null,
          invoiceNumber: latestPurchase?.invoiceNumber || "",
          active: 1,
        },
      });

      if (latestPurchase) {
        await prisma.stockPurchase.update({
          where: { id: latestPurchase.id },
          data: {
            batchId: batch.id,
            batchNumber: batchNo,
          },
        });
      }

      createdCount++;
    }
  }

  console.log(`Backfill completed. Created ${createdCount} baseline batches.`);
}

run()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
