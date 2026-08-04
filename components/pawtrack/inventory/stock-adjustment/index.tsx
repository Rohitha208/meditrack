"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Combobox } from "@/components/ui/combobox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  adjustmentType: z.enum(["in", "out", "transfer"]),
  quantity: z.number().min(1, "Quantity must be greater than 0"),
  unitCost: z.string().min(1, "Unit cost is required"),
  adjustmentDate: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
  reason: z.string().min(1, "Reason is required"),
  adjustedBy: z.string().min(1, "Adjusted by is required"),
})

type StockAdjustmentFormValues = z.infer<typeof stockAdjustmentSchema>

export default function StockAdjustmentPage() {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    const form = useForm<StockAdjustmentFormValues>({
        resolver: zodResolver(stockAdjustmentSchema),
        defaultValues: {
            productId: "",
            adjustmentType: "in",
            quantity: 0,
            unitCost: "",
            adjustmentDate: new Date().toISOString().split("T")[0],
            reference: "",
            reason: "",
            adjustedBy: "",
        },
    })

    // Mock product data
    const mockProduct: Product = {
        name: "Cephalexin 500mg",
        sku: "MED-001",
        category: "Medications",
        supplier: "Covetrus",
        currentStock: 3,
        reorderPoint: 10,
        unitCost: 15.75,
        location: "Shelf B-12",
    }

    const handleSearch = () => {
        // In a real app, this would search for the product
        setSelectedProduct(mockProduct)
        form.setValue("unitCost", mockProduct.unitCost.toString())
    }

    const calculateNewStockLevel = (): number => {
        if (!selectedProduct) return 0

        switch (form.getValues("adjustmentType")) {
            case "in":
                return selectedProduct.currentStock + form.getValues("quantity")
            case "out":
                return selectedProduct.currentStock - form.getValues("quantity")
            case "transfer":
                return selectedProduct.currentStock // Transfer doesn't change total stock
            default:
                return selectedProduct.currentStock
        }
    }

    const handleSaveAdjustment = (values: StockAdjustmentFormValues) => {
        alert("Stock adjustment saved!")
        // In a real app, this would save the adjustment to the database
    }

    return (
        <>
            <div className="p-4">
                <Link href="/inventory">
                    <Button variant="ghost" className="gap-1 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Inventory
                    </Button>
                </Link>
                <Card className="bg-white dark:bg-slate-800 shadow-sm mb-6 mt-4">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Adjust Inventory Stock</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Record stock additions, removals, or transfers with proper documentation
                        </p>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSaveAdjustment)} className="space-y-8">
                                {/* Step 1: Select Product */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">1. Select Product</h3>
                                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                                        <Combobox
                                            options={[]}
                                            onValueChange={() => { }}
                                            placeholder="Search products..."
                                        />
                                        <div className="w-full md:w-64">
                                            <Combobox
                                                options={[
                                                    { value: "all", label: "Category: All" },
                                                    { value: "medications", label: "Medications" },
                                                    { value: "vaccines", label: "Vaccines" },
                                                    { value: "supplies", label: "Medical Supplies" },
                                                    { value: "food", label: "Food & Supplements" }
                                                ]}
                                                value="all"
                                                onValueChange={() => {}}
                                                placeholder="Category: All"
                                            />
                                        </div>
                                        <Button className="theme-button text-white" onClick={handleSearch}>
                                            Search
                                        </Button>
                                    </div>

                                    {selectedProduct && (
                                        <Card className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700">
                                            <CardContent className="p-4">
                                                <div className="flex flex-col md:flex-row justify-between">
                                                    <div className="mb-4 md:mb-0">
                                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedProduct.name}</h4>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            SKU: {selectedProduct.sku} | Category: {selectedProduct.category} | Supplier:{" "}
                                                            {selectedProduct.supplier}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Current Stock:</p>
                                                            <p
                                                                className={`font-semibold ${selectedProduct.currentStock < selectedProduct.reorderPoint ? "text-red-600" : "text-gray-900 dark:text-white"}`}
                                                            >
                                                                {selectedProduct.currentStock}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Reorder Point:</p>
                                                            <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.reorderPoint}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Unit Cost:</p>
                                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                                ${selectedProduct.unitCost.toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Location:</p>
                                                            <p className="font-semibold text-gray-900 dark:text-white">{selectedProduct.location}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Step 2: Adjustment Type */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">2. Adjustment Type</h3>
                                    <FormField
                                        control={form.control}
                                        name="adjustmentType"
                                        render={({ field }) => (
                                            <FormItem>
                                                <div className="flex flex-wrap gap-4">
                                                    <Button
                                                        type="button"
                                                        className={field.value === "in" ? "theme-button text-white" : "theme-button-outline"}
                                                        onClick={() => field.onChange("in")}
                                                    >
                                                        Stock In
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        className={field.value === "out" ? "theme-button text-white" : "theme-button-outline"}
                                                        onClick={() => field.onChange("out")}
                                                    >
                                                        Stock Out
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        className={field.value === "transfer" ? "theme-button text-white" : "theme-button-outline"}
                                                        onClick={() => field.onChange("transfer")}
                                                    >
                                                        Transfer
                                                    </Button>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Step 3: Adjustment Details */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">3. Adjustment Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormField
                                            control={form.control}
                                            name="quantity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Quantity</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            {...field}
                                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="unitCost"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Unit Cost ($)</FormLabel>
                                                    <FormControl>
                                                        <Input {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="adjustmentDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Adjustment Date</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="reference"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Reference</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="PO-482" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="reason"
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-2">
                                                    <FormLabel>Reason</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Received order from Covetrus"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="adjustedBy"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Adjusted By</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Dr. Smith" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons and Summary */}
                                <div className="flex flex-col md:flex-row justify-between items-center">
                                    <div className="flex gap-4 mb-4 md:mb-0">
                                        <Button type="submit" className="theme-button text-white">
                                            Save Adjustment
                                        </Button>
                                        <Button type="button" variant="outline">Cancel</Button>
                                    </div>

                                    {selectedProduct && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">New Stock Level:</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{calculateNewStockLevel()}</p>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    )
}
// Type definitions
interface Product {
    name: string
    sku: string
    category: string
    supplier: string
    currentStock: number
    reorderPoint: number
    unitCost: number
    location: string
}

