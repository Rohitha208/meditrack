"use client"

import { useState } from "react"
import { InventoryBreadcrumb } from "@/components/pawtrack/inventory/inventory-breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
} from "@/components/ui/pagination"
import { ProductDrawer } from "@/components/pawtrack/inventory/product-drawer"

// Sample product data
const products = [
  {
    id: 1,
    name: "Cephalexin 500mg",
    sku: "MED-001",
    category: "Medications",
    supplier: "Covetrus",
    inStock: 3,
    price: 15.75,
  },
  {
    id: 2,
    name: "Heartworm Test Kit",
    sku: "TST-045",
    category: "Diagnostics",
    supplier: "IDEXX",
    inStock: 4,
    price: 25.5,
  },
  {
    id: 3,
    name: "Rabies Vaccine",
    sku: "VAC-022",
    category: "Vaccines",
    supplier: "Zoetis",
    inStock: 32,
    price: 12.99,
  },
  {
    id: 4,
    name: "Rimadyl 75mg",
    sku: "MED-105",
    category: "Medications",
    supplier: "Zoetis",
    inStock: 5,
    price: 34.25,
  },
  {
    id: 5,
    name: "Syringes 3ml",
    sku: "SUP-078",
    category: "Medical Supplies",
    supplier: "BD",
    inStock: 12,
    price: 0.75,
  },
]

// Category filter options
const categories = ["Medications", "Vaccines", "Medical Supplies", "Food & Supplements", "Diagnostics"]

export default function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState("Name")
  const [currentPage, setCurrentPage] = useState(1)

  // Drawer state
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>()

  // Handle edit button click
  const handleEditClick = (productId: number) => {
    setSelectedProductId(productId.toString())
    setEditDrawerOpen(true)
  }

  return (
    <>
      <div className="p-6">
   

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">Product Catalog</h1>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              className="border-purple-500 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              Import
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setAddDrawerOpen(true)}>
              Add Item
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-3 pr-10 py-2 w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Category: All</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort By: Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Name">Sort By: Name</SelectItem>
                <SelectItem value="SKU">Sort By: SKU</SelectItem>
                <SelectItem value="Price">Sort By: Price</SelectItem>
                <SelectItem value="Stock">Sort By: Stock</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">Apply</Button>
          </div>
        </div>

        {/* Category Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <Button
              key={category}
              variant="outline"
              className={`rounded-full ${
                selectedCategory === category
                  ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700"
                  : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-slate-800 rounded-md shadow overflow-hidden mb-6">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-slate-700">
              <TableRow>
                <TableHead className="font-semibold">Product Name</TableHead>
                <TableHead className="font-semibold">SKU</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Supplier</TableHead>
                <TableHead className="font-semibold text-center">In Stock</TableHead>
                <TableHead className="font-semibold">Price</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.sku}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>{product.supplier}</TableCell>
                  <TableCell className="text-center">
                    <span className={product.inStock <= 5 ? "text-red-500 font-medium" : ""}>{product.inStock}</span>
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      onClick={() => handleEditClick(product.id)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Showing 1-5 of 423 products</p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  className={`${currentPage === 1 ? "bg-purple-600 text-white" : ""}`}
                  onClick={() => setCurrentPage(1)}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(2)}>2</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink onClick={() => setCurrentPage(3)}>3</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage(currentPage + 1)} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Add Product Drawer */}
      <ProductDrawer open={addDrawerOpen} onOpenChange={setAddDrawerOpen} mode="add" />

      {/* Edit Product Drawer */}
      <ProductDrawer open={editDrawerOpen} onOpenChange={setEditDrawerOpen} mode="edit" productId={selectedProductId} />
    </>
  )
}
