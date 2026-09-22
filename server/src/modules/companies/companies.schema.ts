import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
