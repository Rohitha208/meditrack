import { z } from "zod";

export const productSchema = z.object({
  productNumber: z.string().min(2, 'Product number must be at least 2 characters'),
  name: z.string().min(2, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number({
    required_error: 'Cost price is required',
    invalid_type_error: 'Cost price must be a number'
  }).min(0.01, 'Cost price must be greater than 0'),
  sellingPrice: z.number().min(0.01, 'Selling price is required and must be greater than 0'),
  reorderThreshold: z.number().int().nonnegative().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  brandName: z.string().optional(),
  genericName: z.string().optional(),
  manufacturer: z.string().optional(),
  ndcNumber: z.string().optional(),
  strength: z.string().optional(),
  dosageForm: z.string().optional(),
  controlledSubstanceSchedule: z.string().optional(),
  storageRequirements: z.string().optional(),
  requiresPrescription: z.boolean(),
  isActive: z.boolean(),
  companyId: z.string().optional(),
});

export type ProductFormValues = {
  companyId: string;
  productNumber: string;
  name: string;
  brandName: string;
  genericName: string;
  category: string;
  manufacturer: string;
  ndcNumber: string;
  strength: string;
  dosageForm: string;
  unitOfMeasure: string;
  requiresPrescription: boolean;
  controlledSubstanceSchedule: string;
  storageRequirements: string;
  reorderThreshold: number | null;
  price: number;
  sellingPrice: number;
  isActive: boolean;
};

export const defaultProductValues: Partial<ProductFormValues> = {
  companyId: "",
  productNumber: "",
  name: "",
  brandName: "",
  genericName: "",
  category: "",
  manufacturer: "",
  ndcNumber: "",
  strength: "",
  dosageForm: "",
  unitOfMeasure: "EA",
  requiresPrescription: false,
  controlledSubstanceSchedule: "",
  storageRequirements: "",
  reorderThreshold: null,
  price: 0,
  sellingPrice: 0,
  isActive: true,
};
