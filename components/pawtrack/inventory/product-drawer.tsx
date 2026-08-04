"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"

// Sample data for dropdowns
const categories = ["Medications", "Vaccines", "Medical Supplies", "Food & Supplements", "Diagnostics"]
const suppliers = ["Covetrus", "IDEXX", "Zoetis", "BD", "MWI", "Patterson"]
const unitOptions = ["Each", "Box", "Bottle", "Pack", "Case", "Vial"]
const statusOptions = ["Active", "Inactive", "Discontinued", "On Order"]

// Sample product data (in a real app, this would come from an API)
const productData = {
  id: "1",
  name: "Cephalexin 500mg",
  sku: "MED-001",
  description: "Antibiotic capsules for treating bacterial infections in dogs and cats.\nFor veterinary use only.",
  category: "Medications",
  supplier: "Covetrus",
  brand: "Generic",
  currentStock: "3",
  reorderPoint: "10",
  unitOfMeasure: "Each",
  location: "Shelf B-12",
  costPrice: "15.75",
  salePrice: "22.50",
  markup: "42.9",
  status: "Active",
  lastUpdated: "May 10, 2025",
}

// Sample recent activity data
const recentActivity = [
  {
    date: "May 12, 2025",
    user: "Dr. Johnson",
    action: "Dispensed 2 units",
  },
  {
    date: "May 8, 2025",
    user: "Mike",
    action: "Flagged as low stock",
  },
  {
    date: "May 1, 2025",
    user: "Sarah",
    action: "Added 5 units from order PO-478",
  },
]

interface ProductDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "edit"
  productId?: string
}

export function ProductDrawer({ open, onOpenChange, mode, productId }: ProductDrawerProps) {
  // Initialize state based on mode
  const isEditMode = mode === "edit"
  const initialProduct = isEditMode
    ? productData
    : {
        id: "",
        name: "",
        sku: "",
        description: "",
        category: "",
        supplier: "",
        brand: "",
        currentStock: "0",
        reorderPoint: "10",
        unitOfMeasure: "Each",
        location: "",
        costPrice: "0.00",
        salePrice: "0.00",
        markup: "30",
        status: "Active",
        lastUpdated: "",
      }

  const [productName, setProductName] = useState(initialProduct.name)
  const [sku, setSku] = useState(initialProduct.sku)
  const [description, setDescription] = useState(initialProduct.description)
  const [category, setCategory] = useState(initialProduct.category)
  const [supplier, setSupplier] = useState(initialProduct.supplier)
  const [brand, setBrand] = useState(initialProduct.brand)
  const [currentStock, setCurrentStock] = useState(initialProduct.currentStock)
  const [reorderPoint, setReorderPoint] = useState(initialProduct.reorderPoint)
  const [unitOfMeasure, setUnitOfMeasure] = useState(initialProduct.unitOfMeasure)
  const [location, setLocation] = useState(initialProduct.location)
  const [costPrice, setCostPrice] = useState(initialProduct.costPrice)
  const [salePrice, setSalePrice] = useState(initialProduct.salePrice)
  const [markup, setMarkup] = useState(initialProduct.markup)
  const [status, setStatus] = useState(initialProduct.status)

  // Calculate sale price based on cost and markup
  const calculateSalePrice = (cost: string, markupPercent: string) => {
    const costValue = Number.parseFloat(cost) || 0
    const markupValue = Number.parseFloat(markupPercent) || 0
    const calculatedPrice = costValue * (1 + markupValue / 100)
    return calculatedPrice.toFixed(2)
  }

  // Update sale price when cost or markup changes
  const handleCostChange = (value: string) => {
    setCostPrice(value)
    setSalePrice(calculateSalePrice(value, markup))
  }

  const handleMarkupChange = (value: string) => {
    setMarkup(value)
    setSalePrice(calculateSalePrice(costPrice, value))
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Close the drawer
    onOpenChange(false)
  }

  // Handle product deletion
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this product?")) {
      // Close the drawer
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{isEditMode ? `Edit Product: ${productData.name}` : "Add New Product"}</SheetTitle>
          {isEditMode && (
            <SheetDescription>
              SKU: {productData.sku} | Last updated: {productData.lastUpdated}
            </SheetDescription>
          )}
          {!isEditMode && (
            <SheetDescription>Add a new product to your inventory with complete details</SheetDescription>
          )}
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Basic Details */}
            <div className="col-span-full">
              <h3 className="text-lg font-medium mb-4">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Label htmlFor="productName">Product Name*:</Label>
                  <Input
                    id="productName"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU*:</Label>
                  <Input
                    id="sku"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="mt-1"
                    placeholder={isEditMode ? "" : "e.g., MED-001"}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status:</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="mt-1">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-full">
                  <Label htmlFor="description">Description:</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Categorization */}
            <div className="col-span-full">
              <h3 className="text-lg font-medium mb-4">Categorization</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="category">Category:</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category" className="mt-1">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier:</Label>
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger id="supplier" className="mt-1">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup} value={sup}>
                          {sup}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="brand">Brand/Manufacturer:</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="mt-1"
                    placeholder={isEditMode ? "" : "Optional"}
                  />
                </div>
              </div>
            </div>

            {/* Inventory Details */}
            <div className="col-span-full">
              <h3 className="text-lg font-medium mb-4">Inventory Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor={isEditMode ? "currentStock" : "initialStock"}>
                    {isEditMode ? "Current Stock:" : "Initial Stock:"}
                  </Label>
                  <Input
                    id={isEditMode ? "currentStock" : "initialStock"}
                    type="number"
                    min="0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="reorderPoint">Reorder Point:</Label>
                  <Input
                    id="reorderPoint"
                    type="number"
                    min="0"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="unitOfMeasure">Unit of Measure:</Label>
                  <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
                    <SelectTrigger id="unitOfMeasure" className="mt-1">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location:</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="mt-1"
                    placeholder={isEditMode ? "" : "e.g., Shelf B-12"}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="col-span-full">
              <h3 className="text-lg font-medium mb-4">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="costPrice">Cost Price ($):</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => handleCostChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="salePrice">Sale Price ($):</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="markup">Markup (%):</Label>
                  <Input
                    id="markup"
                    type="number"
                    min="0"
                    value={markup}
                    onChange={(e) => handleMarkupChange(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Recent Activity (Edit mode only) */}
            {isEditMode && (
              <div className="col-span-full">
                <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {activity.date} - {activity.user}
                          </p>
                          <p className="font-medium">{activity.action}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <SheetFooter className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            {isEditMode && (
              <Button type="button" variant="destructive" onClick={handleDelete} className="sm:mr-auto">
                Delete
              </Button>
            )}
            <div className="flex gap-3 w-full sm:w-auto">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="flex-1 sm:flex-none">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white flex-1 sm:flex-none">
                {isEditMode ? "Save" : "Save Product"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
