import { z } from "zod"

// Item schema for the purchase order
export const purchaseOrderItemSchema = z.object({
  productId: z.string().uuid("Please select a product"),
  quantityOrdered: z.number().min(1, "Quantity must be at least 1"),
  unitCost: z.number().min(0.01, "Unit cost is required"),
  discountPercentage: z.number().min(0).max(100).default(0),
  discountedAmount: z.number().min(0).default(0),
  extendedAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0).default(0)
})

// Main purchase order schema
export const purchaseOrderSchema = z.object({
  supplierId: z.string().uuid("Please select a supplier"),
  expectedDeliveryDate: z.string()
    .min(1, "Expected delivery date is required")
    .refine((dateString) => {
      // Parse date from DD/MM/YYYY string
      const [day, month, year] = dateString.split('/').map(Number);
      const parsedDate = new Date(year, month - 1, day);

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      return !isNaN(parsedDate.getTime()) && parsedDate >= today;
    }, "Expected delivery date must be today or in the future"),
  status: z.string().default("ordered"),
  discountPercentage: z.number().min(0).max(100).default(0),
  discountedAmount: z.number().min(0).default(0),
  extendedAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0).default(0),
  notes: z.string().default("")
})

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>
export type PurchaseOrderItemValues = z.infer<typeof purchaseOrderItemSchema>
