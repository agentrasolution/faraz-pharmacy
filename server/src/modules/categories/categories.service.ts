import { prisma, Prisma } from "../../services/prisma";
import { NotFoundError } from "../../utils/errors";
import type { CreateCategoryInput } from "./categories.schema";

export const categoriesService = {
  async list({ page = 1, limit = 50, search }: { page?: number; limit?: number; search?: string } = {}) {
    const where: Prisma.CategoryWhereInput = {};

    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, data] = await prisma.$transaction([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
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

  async create(data: CreateCategoryInput) {
    return prisma.category.create({
      data: { name: data.name },
    });
  },

  async update(id: string, data: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Category");
    return prisma.category.update({
      where: { id },
      data: { name: data.name },
    });
  },

  async remove(id: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Category");
    await prisma.category.delete({ where: { id } });
    return { success: true };
  },
};
