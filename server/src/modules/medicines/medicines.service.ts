import { prisma } from "../../services/prisma";
import { NotFoundError } from "../../utils/errors";
import type { CreateProductInput } from "./medicines.schema";

export const medicinesService = {
  async list(includeArchived = false) {
    const where = includeArchived ? {} : { active: 1 };
    return prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      include: { prices: true },
    });
  },

  async search(query: string) {
    const q = `%${query}%`;
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM products WHERE active = 1 AND (barcode ILIKE $1 OR name ILIKE $1) ORDER BY name LIMIT 50`,
      q,
    );
    return rows;
  },

  async getByBarcode(barcode: string) {
    return prisma.product.findUnique({
      where: { barcode },
      include: { prices: true },
    });
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { prices: true },
    });
    if (!product) throw new NotFoundError("Product");
    return product;
  },

  async create(data: CreateProductInput) {
    const salePrice = data.salePrice && data.salePrice > 0
      ? data.salePrice
      : Math.round(data.purchasePrice * (1 + (data.markupPercent ?? 20) / 100));

    const pricesData = data.prices && data.prices.length > 0
      ? data.prices.map((p) => ({
          label: p.label ?? "Standard",
          purchasePrice: p.purchasePrice,
          salePrice: p.salePrice && p.salePrice > 0
            ? p.salePrice
            : Math.round(p.purchasePrice * (1 + (data.markupPercent ?? 20) / 100)),
        }))
      : [];

    return prisma.product.create({
      data: {
        barcode: data.barcode,
        name: data.name,
        company: data.company ?? "",
        category: data.category ?? "",
        location: data.location ?? "",
        distributorId: data.distributorId ?? null,
        salePrice,
        purchasePrice: data.purchasePrice,
        markupPercent: data.markupPercent ?? 20,
        stockQty: data.stockQty ?? 0,
        expiry: data.expiry ?? null,
        prices: { createMany: { data: pricesData } },
        barcodeLink: {
          connectOrCreate: {
            where: { code: data.barcode },
            create: { code: data.barcode },
          },
        },
      },
      include: { prices: true },
    });
  },

  async update(id: string, data: CreateProductInput) {
    const old = await prisma.product.findUnique({ where: { id } });
    if (!old) throw new NotFoundError("Product");

    const salePrice = data.salePrice && data.salePrice > 0
      ? data.salePrice
      : Math.round(data.purchasePrice * (1 + (data.markupPercent ?? old.markupPercent) / 100));

    const updateData: Record<string, unknown> = {
      barcode: data.barcode,
      name: data.name,
      company: data.company ?? "",
      category: data.category ?? "",
      location: data.location ?? "",
      distributorId: data.distributorId ?? null,
      salePrice,
      purchasePrice: data.purchasePrice,
      markupPercent: data.markupPercent ?? old.markupPercent,
      stockQty: data.stockQty ?? 0,
      expiry: data.expiry ?? null,
    };

    if (data.prices) {
      const pricesData = data.prices.map((p) => ({
        label: p.label ?? "Standard",
        purchasePrice: p.purchasePrice,
        salePrice: p.salePrice && p.salePrice > 0
          ? p.salePrice
          : Math.round(p.purchasePrice * (1 + (data.markupPercent ?? old.markupPercent) / 100)),
      }));

      await prisma.productPrice.deleteMany({ where: { productId: id } });
      updateData.prices = { createMany: { data: pricesData } };
    }

    updateData.barcodeLink = {
      connectOrCreate: {
        where: { code: data.barcode },
        create: { code: data.barcode },
      },
    };

    return prisma.product.update({
      where: { id },
      data: updateData as any,
      include: { prices: true },
    });
  },

  async archive(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product");
    return prisma.product.update({ where: { id }, data: { active: 0 } });
  },

  async restore(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product");
    return prisma.product.update({ where: { id }, data: { active: 1 } });
  },

  async hardDelete(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Product");
    
    // Delete linked barcodes first
    await prisma.barcode.deleteMany({ where: { productId: id } });
    
    // Delete price tiers
    await prisma.productPrice.deleteMany({ where: { productId: id } });
    
    // Delete the product
    await prisma.product.delete({ where: { id } });
    
    return { success: true };
  },
};
