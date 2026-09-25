import { prisma, Prisma } from "../../services/prisma";
import { NotFoundError } from "../../utils/errors";
import type { CreateCompanyInput } from "./companies.schema";

export const companiesService = {
  async list({ page = 1, limit = 50, search }: { page?: number; limit?: number; search?: string } = {}) {
    const where: Prisma.CompanyWhereInput = {
      products: { some: {} },
    };

    if (search) {
      const q = search.trim();
      where.AND = [
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

  async getById(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { name: "asc" },
        },
      },
    });
    if (!company) throw new NotFoundError("Company");

    const totalStock = company.products.reduce((sum, p) => sum + (p.stockQty ?? 0), 0);

    return {
      id: company.id,
      name: company.name,
      created_at: company.createdAt.toISOString(),
      product_count: company.products.length,
      total_stock: totalStock,
      products: company.products.map((p) => ({
        id: p.id,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        location: p.location,
        sale_price: p.salePrice,
        purchase_price: p.purchasePrice,
        stock_qty: p.stockQty,
        expiry: p.expiry ?? null,
        active: p.active,
        created_at: p.createdAt.toISOString(),
      })),
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
