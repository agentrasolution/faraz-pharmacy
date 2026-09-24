import { prisma, Prisma } from "../../services/prisma";
import { NotFoundError } from "../../utils/errors";
import { emitEvent } from "../../socket";
import type { CreateStockInput } from "./purchases.schema";

export const purchasesService = {
  async list({ page = 1, limit = 100000, search, dateFrom, dateTo }: { page?: number; limit?: number; search?: string; dateFrom?: string; dateTo?: string } = {}) {
    const where: Prisma.StockPurchaseWhereInput = {};

    if (search) {
      const q = search.trim();
      where.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { product: { name: { contains: q, mode: "insensitive" } } },
        { distributor: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
      }
    }

    const skip = (page - 1) * limit;

    const [total, data] = await prisma.$transaction([
      prisma.stockPurchase.count({ where }),
      prisma.stockPurchase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          product: { select: { name: true } },
          distributor: { select: { name: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async create(data: CreateStockInput) {
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { purchasePrice: true, salePrice: true },
    });

    const price = product?.purchasePrice ?? 0;
    const salePrice = product?.salePrice ?? 0;
    const totalValue = data.quantity * price;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const stockPurchase = await tx.stockPurchase.create({
        data: {
          productId: data.productId,
          distributorId: data.distributorId ?? null,
          invoiceNumber: data.invoiceNumber ?? "",
          quantity: data.quantity,
          purchasePrice: price,
          salePrice,
          expiry: data.expiry ?? null,
          totalValue,
        },
        include: {
          product: { select: { name: true } },
          distributor: { select: { name: true } },
        },
      });

      await tx.product.update({
        where: { id: data.productId },
        data: {
          stockQty: { increment: data.quantity },
          expiry: data.expiry ?? undefined,
        },
      });

      emitEvent("stock:updated", stockPurchase);
      return stockPurchase;
    });
  },

  async update(id: string, data: Partial<CreateStockInput & { quantity: number }>) {
    const old = await prisma.stockPurchase.findUnique({ where: { id } });
    if (!old) throw new NotFoundError("Stock purchase");

    const qtyDiff = (data.quantity ?? old.quantity) - old.quantity;
    const totalValue = (data.quantity ?? old.quantity) * old.purchasePrice;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.stockPurchase.update({
        where: { id },
        data: {
          quantity: data.quantity ?? old.quantity,
          expiry: data.expiry ?? old.expiry,
          totalValue,
          invoiceNumber: data.invoiceNumber ?? old.invoiceNumber,
          distributorId: data.distributorId ?? old.distributorId,
        },
        include: {
          product: { select: { name: true } },
          distributor: { select: { name: true } },
        },
      });

      await tx.product.update({
        where: { id: old.productId },
        data: {
          stockQty: { increment: qtyDiff },
          expiry: data.expiry ?? undefined,
        },
      });

      return updated;
    });
  },

  async remove(id: string) {
    const old = await prisma.stockPurchase.findUnique({ where: { id } });
    if (!old) throw new NotFoundError("Stock purchase");

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.stockPurchase.update({
        where: { id },
        data: { active: 0 },
      });

      await tx.product.update({
        where: { id: old.productId },
        data: { stockQty: { decrement: old.quantity } },
      });

      return { success: true };
    });
  },
};
