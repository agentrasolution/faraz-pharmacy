import { prisma } from "../../services/prisma";
import { NotFoundError } from "../../utils/errors";
import type { CreateCompanyInput } from "./companies.schema";

export const companiesService = {
  async list() {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
    });
    
    // Count products for each company by name match
    const companiesWithCount = await Promise.all(
      companies.map(async (c) => {
        const product_count = await prisma.product.count({
          where: { company: c.name },
        });
        return { ...c, product_count };
      })
    );
    
    return companiesWithCount;
  },

  async create(data: CreateCompanyInput) {
    return prisma.company.create({
      data: {
        name: data.name,
        address: data.address ?? "",
      },
    });
  },

  async update(id: string, data: CreateCompanyInput) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Company");
    return prisma.company.update({
      where: { id },
      data: {
        name: data.name,
        address: data.address ?? "",
      },
    });
  },

  async remove(id: string) {
    const existing = await prisma.company.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Company");
    await prisma.company.delete({ where: { id } });
    return { success: true };
  },
};
