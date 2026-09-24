import { prisma, Prisma } from "../../services/prisma";
import { NotFoundError } from "../../utils/errors";
import type { CreateCompanyInput } from "./companies.schema";

export const companiesService = {
  async list({ page = 1, limit = 50, search }: { page?: number; limit?: number; search?: string } = {}) {
    const where: Prisma.CompanyWhereInput = {};

    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, data] = await prisma.$transaction([
      prisma.company.count({ where }),
      prisma.company.findMany({
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

  async create(data: CreateCompanyInput) {
    return prisma.company.create({
      data: { name: data.name },
    });
  },

  async update(id: string, data: CreateCompanyInput) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Company");
    return prisma.company.update({
      where: { id },
      data: { name: data.name },
    });
  },

  async remove(id: string) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Company");
    await prisma.company.delete({ where: { id } });
    return { success: true };
  },
};
