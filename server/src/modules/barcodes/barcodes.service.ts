import { prisma } from "../../services/prisma";
import { BadRequestError, NotFoundError } from "../../utils/errors";

export const barcodesService = {
  async list(includeArchived = false) {
    const where = includeArchived ? {} : { product: { active: 1 } };
    return prisma.barcode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { name: true, active: true },
        },
      },
    });
  },

  async create(code: string) {
    const existing = await prisma.barcode.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestError("Barcode already exists");
    }
    return prisma.barcode.create({
      data: { code },
      include: { product: { select: { name: true, active: true } } },
    });
  },

  async archive(id: string) {
    const barcode = await prisma.barcode.findUnique({ where: { id } });
    if (!barcode) throw new NotFoundError("Barcode");
    if (!barcode.productId) {
      throw new BadRequestError("Cannot archive a barcode without a product");
    }
    // Archive the linked product
    await prisma.product.update({
      where: { id: barcode.productId },
      data: { active: 0 },
    });
    return { success: true };
  },

  async restore(id: string) {
    const barcode = await prisma.barcode.findUnique({ where: { id } });
    if (!barcode) throw new NotFoundError("Barcode");
    if (!barcode.productId) {
      throw new BadRequestError("Cannot restore a barcode without a product");
    }
    // Restore the linked product
    await prisma.product.update({
      where: { id: barcode.productId },
      data: { active: 1 },
    });
    return { success: true };
  },

  async remove(id: string) {
    const barcode = await prisma.barcode.findUnique({ where: { id } });
    if (!barcode) throw new NotFoundError("Barcode");

    // Allow deletion if:
    // 1. No product linked, OR
    // 2. Product is archived (active = 0)
    if (barcode.productId) {
      const product = await prisma.product.findUnique({ where: { id: barcode.productId } });
      if (product && product.active === 1) {
        throw new BadRequestError(
          "Cannot delete a barcode linked to an active product. Archive the product first."
        );
      }
    }

    await prisma.barcode.delete({ where: { id } });
    return { success: true };
  },

  async removeByProductId(productId: string) {
    // Delete all barcodes linked to a product (used when hard deleting a product)
    await prisma.barcode.deleteMany({ where: { productId } });
    return { success: true };
  },
};
