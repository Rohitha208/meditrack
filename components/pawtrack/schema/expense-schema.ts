import { z } from "zod";

export const expenseFormSchema = z.object({
  clinicId: z.string().min(1, "Clinic is required"),
  dateOfExpense: z.string().min(1, "Date is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMode: z.string().min(1, "Payment mode is required"),
  paidTo: z.string().min(1, "Paid to is required"),
  description: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;
