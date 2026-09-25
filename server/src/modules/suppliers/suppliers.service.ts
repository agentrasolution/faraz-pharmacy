import { prisma, Prisma } from "../../services/prisma";
import { NotFoundError } from "../../utils/errors";
import type { CreateDistributorInput } from "./suppliers.schema";

export const suppliersService = {
  async list({ page = 1, limit = 100000, search }: { page?: number; limit?: number; search?: string } = {}) {
    const where: Prisma.DistributorWhereInput = {};

    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { salesmanName: { contains: q, mode: "insensitive" } },
        { salesmanContact: { contains: q, mode: "insensitive" } },
        { deliveryManName: { contains: q, mode: "insensitive" } },
        { deliveryManContact: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, data] = await prisma.$transaction([
      prisma.distributor.count({ where }),
      prisma.distributor.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { products: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async create(data: CreateDistributorInput) {
    return prisma.distributor.create({
      data: {
        name: data.name ?? "",
        salesmanName: data.salesmanName ?? "",
        salesmanContact: data.salesmanContact ?? "",
        deliveryManName: data.deliveryManName ?? "",
        deliveryManContact: data.deliveryManContact ?? "",
      },
    });
  },

  async update(id: string, data: CreateDistributorInput) {
    const existing = await prisma.distributor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Distributor");
    return prisma.distributor.update({
      where: { id },
      data: {
        name: data.name ?? "",
        salesmanName: data.salesmanName ?? "",
        salesmanContact: data.salesmanContact ?? "",
        deliveryManName: data.deliveryManName ?? "",
        deliveryManContact: data.deliveryManContact ?? "",
      },
    });
  },

  async remove(id: string) {
    const existing = await prisma.distributor.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Distributor");
    await prisma.distributor.delete({ where: { id } });
    return { success: true };
  },
};
