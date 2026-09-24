import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findFirst({ where: { role: "admin" } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        role: "admin",
      },
    });
    console.log("Seeded admin user (username: admin, password: admin123)");
  } else {
    console.log("Admin user already exists");
  }



  // const pCount = await prisma.product.count();
  // if (pCount < 100) {
  //   console.log("Seeding dummy products...");
  //   const products = [];
  //   for (let i = 1; i <= 500; i++) {
  //     products.push({
  //       barcode: `TEST-${100000 + i}`,
  //       name: `Dummy Product ${i}`,
  //       category: i % 2 === 0 ? 'Medicine' : 'Cosmetics',
  //       location: `A-${i % 10}`,
  //       purchasePrice: 100 + (i % 50),
  //       salePrice: 150 + (i % 50),
  //       markupPercent: 50,
  //       stockQty: 50 + (i % 20),
  //       active: 1
  //     });
  //   }
  //   await prisma.product.createMany({ data: products });
  //   console.log(`Seeded 500 products`);
  // }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
