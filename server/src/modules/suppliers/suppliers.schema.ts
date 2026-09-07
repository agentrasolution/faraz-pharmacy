import { z } from "zod";

export const createDistributorSchema = z.object({
  name: z.string().optional().default(""),
  salesmanName: z.string().optional().default(""),
  salesmanContact: z.string().optional().default(""),
  deliveryManName: z.string().optional().default(""),
  deliveryManContact: z.string().optional().default(""),
});

export const updateDistributorSchema = createDistributorSchema;

export type CreateDistributorInput = z.infer<typeof createDistributorSchema>;
