import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional().default(""),
});

export const updateCompanySchema = createCompanySchema;

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
