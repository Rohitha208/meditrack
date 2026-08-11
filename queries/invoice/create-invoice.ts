import { useMutation, useQueryClient } from "@tanstack/react-query"

interface CreateInvoiceRequest {
  visitId?: string | null
  clientId: string
  patientId: string
  clinicId: string
  invoiceNumber: string
  itemsTotal: number
  consultationFee: number
  consultationDiscountPercentage: number
  consultationDiscount: number
  consultationFeeAfterDiscount: number
  overallProductDiscount?: number
  overallProductDiscountPercentage?: number
  notes: string
  total: number
  status: string
  paymentMethod?: string
  products: {
    purchaseOrderReceivingHistoryId: string;
    quantity: number;
    isGiven: boolean;
    discount: number
  }[];
}

interface CreateInvoiceData {
  request: CreateInvoiceRequest;
}

const createInvoice = async (data: CreateInvoiceData) => {
  try {
    const response = await fetch('/api/invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data.request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Invoice API error response:", errorData)
      throw new Error(errorData.message || 'Failed to create invoice')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error("Error in createInvoice function:", error)
    throw error
  }
}

export const useCreateInvoice = (options?: {
  onSuccess?: (data: any) => void
  onError?: (error: any) => void
}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      queryClient.invalidateQueries({ queryKey: ["invoice"] })
      queryClient.invalidateQueries({ queryKey: ["patient-invoices"] })
      options?.onSuccess?.(data)
    },
    onError: options?.onError
  })
}