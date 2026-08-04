"use client"

import React, { useState } from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Combobox } from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"

import { toast, useToast } from "@/components/ui/use-toast"
import { useCreatePurchaseOrder } from '@/queries/order/create-purchase-order'
import { useCreatePurchaseOrderItem } from '@/queries/order/create-purchase-order-item'
import { useGetClinic } from '@/queries/clinic/get-clinic'
import { useGetSupplier } from '@/queries/suppliers/get-supplier'
import { useGetProducts } from '@/queries/products/get-products'


// Define the form schemas
const purchaseOrderSchema = z.object({
  clinicId: z.string().uuid(),
  supplierId: z.string().uuid(),
  orderNumber: z.string().min(1, "Order number is required"),
  orderDate: z.string(),
  expectedDeliveryDate: z.string(),
  actualDeliveryDate: z.string().optional(),
  status: z.string(),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  shippingCost: z.number().min(0),
  totalAmount: z.number().min(0),
  notes: z.string().optional(),
  createdBy: z.string().uuid()
})

const purchaseOrderItemSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  productId: z.string().uuid(),
  quantityOrdered: z.number().min(1, "Quantity must be at least 1"),
  quantityReceived: z.number().min(0),
  unitCost: z.number().min(0),
  totalCost: z.number().min(0),
  lotNumber: z.string().min(1, "Lot number is required"),
  expirationDate: z.string()
})

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>
type PurchaseOrderItemFormValues = z.infer<typeof purchaseOrderItemSchema>

// Mock data for dropdowns - replace with actual data from your API
const mockData = {
  clinics: [
    { value: "clinic1", label: "Main Clinic" },
    { value: "clinic2", label: "Branch Clinic" }
  ],
  suppliers: [
    { value: "supplier1", label: "VetSupplies Inc." },
    { value: "supplier2", label: "MediVet" }
  ],
  products: [
    { value: "product1", label: "Amoxicillin 250mg" },
    { value: "product2", label: "Rabies Vaccine" }
  ],
  purchaseOrders: [
    { value: "order1", label: "PO-2024-001" },
    { value: "order2", label: "PO-2024-002" }
  ]

}

interface OrderModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseOrderId?: string // Optional ID for existing purchase order
}

function OrderModal({ isOpen, onClose, purchaseOrderId }: OrderModalProps) {
  const { toast } = useToast()
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string>("")
  const [showNewOrderForm, setShowNewOrderForm] = useState(false)
  const [newOrderId, setNewOrderId] = useState<string | null>(null)

  const purchaseOrderItemForm = useForm<PurchaseOrderItemFormValues>({
    resolver: zodResolver(purchaseOrderItemSchema),
    defaultValues: {
      purchaseOrderId: "",
      productId: "",
      quantityOrdered: 0,
      quantityReceived: 0,
      unitCost: 0,
      totalCost: 0,
      lotNumber: "",
      expirationDate: ""
    },
  })

  const purchaseOrderForm = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      clinicId: "",
      supplierId: "",
      orderNumber: "",
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: "",
      status: "pending",
      subtotal: 0,
      taxAmount: 0,
      shippingCost: 0,
      totalAmount: 0,
      notes: "",
      createdBy: "" // This should be set from your auth context
    },
  })

  const { data: clinicsData, isLoading: isLoadingClinics } = useGetClinic(1, 10, null)
  // const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSupplier()
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSupplier({ })
  

  const clinicOptions = clinicsData?.items?.map(clinic => ({
    value: clinic.id,
    label: clinic.name
  })) || []

  const supplierOptions = suppliersData?.items?.map(supplier => ({
    value: supplier.id,
    label: supplier.name
  })) || []

  const { data: productsData } = useGetProducts(1, 50, {} as any)
  const productOptions = productsData?.items?.map(product => ({
    value: product.id,
    label: product.name
  })) || []

  const { mutate: createPurchaseOrder, isPending: isCreatingOrder } = useCreatePurchaseOrder(
    (data: any) => {
      setNewOrderId(data.id)
      setSelectedPurchaseOrderId(data.id)
      purchaseOrderItemForm.setValue('purchaseOrderId', data.id)
      setShowNewOrderForm(false)
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      })
    },
    () => {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      })
    }
  )

  const { mutate: createPurchaseOrderItem, isPending: isCreatingItem } = useCreatePurchaseOrderItem(
    (data: any) => {
      toast({
        title: "Success",
        description: "Item added to purchase order successfully",
      })
      purchaseOrderItemForm.setValue('purchaseOrderId', data.id)
      onClose()
    },
    () => {
      toast({
        title: "Error",
        description: "Failed to add item to purchase order",
        variant: "destructive",
      })
    }
  )

  const onSubmitPurchaseOrder = (data: PurchaseOrderFormValues) => {
    createPurchaseOrder(data)
  }

  const onSubmitPurchaseOrderItem = (data: PurchaseOrderItemFormValues) => {
    if (!selectedPurchaseOrderId) {
      toast({
        title: "Error",
        description: "Please select a purchase order",
        variant: "destructive",
      })
      return
    }
    createPurchaseOrderItem({ ...data, purchaseOrderId: selectedPurchaseOrderId })
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className={`w-[90%] sm:!max-w-full md:!max-w-[${showNewOrderForm ? '70%' : '50%'}] lg:!max-w-[${showNewOrderForm ? '70%' : '50%'}] overflow-x-hidden overflow-y-auto transition-all duration-300`}>
        <SheetHeader>
          <SheetTitle>Add Order Item</SheetTitle>
        </SheetHeader>

        <div className="flex gap-6 mt-6">
          {/* Item Form Section */}
          <div className={`flex-1 ${showNewOrderForm ? 'w-1/2' : 'w-full'}`}>
            <Form {...purchaseOrderItemForm}>
              <form onSubmit={purchaseOrderItemForm.handleSubmit(onSubmitPurchaseOrderItem)} className="space-y-6">
                <div className="flex items-center justify-between">
                  <FormField
                    control={purchaseOrderItemForm.control}
                    name="purchaseOrderId"
                    render={({ field }) => (
                      <FormItem className="flex-1 mr-4">
                        <FormLabel>Purchase Order</FormLabel>
                        <FormControl>
                          <Combobox
                            options={mockData.purchaseOrders}
                            value={field.value}
                            onValueChange={(value) => {
                              field.onChange(value)
                              setSelectedPurchaseOrderId(value)
                            }}
                            placeholder="Select purchase order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewOrderForm(!showNewOrderForm)}
                    className="mt-8"
                  >
                    {showNewOrderForm ? "Hide New Order" : "New Order"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <FormField
                    control={purchaseOrderItemForm.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product</FormLabel>
                        <FormControl>
                          <Combobox
                            options={productOptions}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select product"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={purchaseOrderItemForm.control}
                    name="quantityOrdered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={purchaseOrderItemForm.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={purchaseOrderItemForm.control}
                    name="lotNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lot Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={purchaseOrderItemForm.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Order Items Table */}
                {selectedPurchaseOrderId && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-2">Order Items</h4>
                    <div className="border rounded-md">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Product</th>
                            <th className="px-3 py-2 text-left font-medium">Qty</th>
                            <th className="px-3 py-2 text-left font-medium">Unit Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Replace this with actual data from your API */}
                          <tr className="border-t">
                            <td className="px-3 py-2">Amoxicillin 250mg</td>
                            <td className="px-3 py-2">10</td>
                            <td className="px-3 py-2">$5.99</td>
                          </tr>
                          <tr className="border-t">
                            <td className="px-3 py-2">Rabies Vaccine</td>
                            <td className="px-3 py-2">5</td>
                            <td className="px-3 py-2">$15.99</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <SheetFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" className="theme-button text-white" disabled={isCreatingItem}>
                    {isCreatingItem ? "Adding..." : "Add Item"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>

          {/* New Order Form Section */}
          {showNewOrderForm && (
            <div className="w-1/2 border-l pl-6">
              <h3 className="text-lg font-semibold mb-4">Create New Purchase Order</h3>
              <Form {...purchaseOrderForm}>
                <form onSubmit={purchaseOrderForm.handleSubmit(onSubmitPurchaseOrder)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={purchaseOrderForm.control}
                      name="clinicId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Clinic</FormLabel>
                          <FormControl>
                            <Combobox
                              options={clinicOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select clinic"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={purchaseOrderForm.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier</FormLabel>
                          <FormControl>
                            <Combobox
                              options={supplierOptions}
                              value={field.value}
                              onValueChange={field.onChange}
                              placeholder="Select supplier"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={purchaseOrderForm.control}
                      name="orderNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={purchaseOrderForm.control}
                      name="orderDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={purchaseOrderForm.control}
                      name="expectedDeliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Delivery Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={purchaseOrderForm.control}
                      name="shippingCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Cost</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={purchaseOrderForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="theme-button text-white w-full" disabled={isCreatingOrder}>
                    {isCreatingOrder ? "Creating..." : "Create Order"}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export { OrderModal } 