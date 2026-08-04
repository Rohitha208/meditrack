"use client"

import { useState } from "react"
import { InventoryBreadcrumb } from "@/components/pawtrack/inventory/inventory-breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Define interfaces at the top level
interface Supplier {
  id: string | number;
  name: string;
  accountNumber: string;
  phone: string;
  email: string;
  description: string;
  contactName: string;
  website: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  isPreferred: boolean;
  hasDirectOrdering: boolean;
  hasAutoNotifications: boolean;
  paymentTerms: string;
  status?: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  availability: string;
  unitPrice: number;
  quantity: number;
}

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [status, setStatus] = useState("All")
  const [sortBy, setSortBy] = useState("Name")

  // Drawer states
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [catalogDrawerOpen, setCatalogDrawerOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  // Sample suppliers data
  const suppliers: Supplier[] = [
    {
      id: "1",
      name: "Covetrus",
      accountNumber: "SUP001",
      phone: "(800) 555-1234",
      email: "orders@covetrus.com",
      description: "Veterinary supplies distribution partner with over 22,000 products available.",
      contactName: "Sarah Reynolds",
      website: "www.covetrus.com",
      address: "400 Metro Place North",
      city: "Dublin",
      state: "OH",
      postalCode: "43017",
      isPreferred: true,
      hasDirectOrdering: true,
      hasAutoNotifications: true,
      paymentTerms: "Net 30",
      status: "Active",
    },
    {
      id: "2",
      name: "IDEXX Laboratories",
      accountNumber: "SUP002",
      phone: "(800) 555-4321",
      email: "support@idexx.com",
      description: "Leading provider of veterinary diagnostics and software.",
      contactName: "Michael Chen",
      website: "www.idexx.com",
      address: "One IDEXX Drive",
      city: "Westbrook",
      state: "ME",
      postalCode: "04092",
      isPreferred: false,
      hasDirectOrdering: true,
      hasAutoNotifications: false,
      paymentTerms: "Net 45",
      status: "Inactive",
    },
    {
      id: "3",
      name: "Zoetis",
      accountNumber: "SUP003",
      phone: "(800) 555-7890",
      email: "vetorders@zoetis.com",
      description: "Global animal health company that delivers quality medicines and vaccines.",
      contactName: "Jennifer Lopez",
      website: "www.zoetis.com",
      address: "10 Sylvan Way",
      city: "Parsippany",
      state: "NJ",
      postalCode: "07054",
      isPreferred: true,
      hasDirectOrdering: false,
      hasAutoNotifications: true,
      paymentTerms: "Net 30",
      status: "Active",
    },
    {
      id: "4",
      name: "MWI Animal Health",
      accountNumber: "SUP004",
      phone: "(800) 555-3456",
      email: "orders@mwianimalhealth.com",
      description: "Distributor of animal health products and services.",
      contactName: "Robert Johnson",
      website: "www.mwiah.com",
      address: "3041 W Pasadena Dr",
      city: "Boise",
      state: "ID",
      postalCode: "83705",
      isPreferred: false,
      hasDirectOrdering: false,
      hasAutoNotifications: false,
      paymentTerms: "Net 15",
      status: "Inactive",
    },
  ]

  // Sample catalog products for the selected supplier
  const catalogProducts: Product[] = [
    {
      id: 1,
      name: "Cephalexin 500mg",
      sku: "CV-12345",
      category: "Medications",
      availability: "In Stock",
      unitPrice: 14.5,
      quantity: 10,
    },
    {
      id: 2,
      name: "Heartworm Test Kit",
      sku: "CV-23456",
      category: "Diagnostics",
      availability: "In Stock",
      unitPrice: 22.75,
      quantity: 6,
    },
    {
      id: 3,
      name: "Rimadyl 75mg",
      sku: "CV-34567",
      category: "Medications",
      availability: "In Stock",
      unitPrice: 32.99,
      quantity: 15,
    },
    {
      id: 4,
      name: "Syringes 3ml (Box of 100)",
      sku: "CV-45678",
      category: "Medical Supplies",
      availability: "In Stock",
      unitPrice: 18.5,
      quantity: 2,
    },
    {
      id: 5,
      name: "Rabies Vaccine",
      sku: "CV-56789",
      category: "Vaccines",
      availability: "In Stock",
      unitPrice: 11.25,
      quantity: 20,
    },
  ]

  const handleOpenEditDrawer = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setEditDrawerOpen(true)
  }

  const handleOpenCatalogDrawer = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setCatalogDrawerOpen(true)
  }

  return (
    <>
      <div className="p-6">
      

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-0">Suppliers</h1>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setAddDrawerOpen(true)}>
            Add Supplier
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-48">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">Status: All</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By: Name" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Name">Sort By: Name</SelectItem>
                <SelectItem value="Recent">Recent</SelectItem>
                <SelectItem value="Spend">Spend</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">Apply</Button>
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onViewCatalog={() => handleOpenCatalogDrawer(supplier)}
              onEdit={() => handleOpenEditDrawer(supplier)}
            />
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total Suppliers" value="12" textColor="text-purple-600" />
          <StatCard title="Orders This Month" value="14" textColor="text-purple-600" />
          <StatCard title="Spend This Month" value="$4,328.75" textColor="text-purple-600" />
        </div>

        {/* Pagination */}
        <div className="flex justify-end">
          <div className="flex">
            <Button variant="outline" className="rounded-l-md bg-purple-600 text-white hover:bg-purple-700">
              1
            </Button>
            <Button variant="outline" className="rounded-none border-l-0">
              2
            </Button>
            <Button variant="outline" className="rounded-r-md border-l-0">
              →
            </Button>
          </div>
        </div>

        {/* Add Supplier Drawer */}
        <Sheet open={addDrawerOpen} onOpenChange={setAddDrawerOpen}>
          <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto" side="right">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">Add New Supplier</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <SupplierForm onCancel={() => setAddDrawerOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* Edit Supplier Drawer */}
        <Sheet open={editDrawerOpen} onOpenChange={setEditDrawerOpen}>
          <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto" side="right">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">Edit Supplier</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {selectedSupplier && (
                <SupplierForm supplier={selectedSupplier} isEdit={true} onCancel={() => setEditDrawerOpen(false)} />
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Supplier Catalog Drawer */}
        <Sheet open={catalogDrawerOpen} onOpenChange={setCatalogDrawerOpen}>
          <SheetContent className="w-full sm:max-w-xl md:max-w-3xl lg:max-w-4xl overflow-y-auto" side="right">
            <SheetHeader>
              <SheetTitle className="text-2xl font-bold">
                {selectedSupplier ? `${selectedSupplier.name} Product Catalog` : "Supplier Catalog"}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              {selectedSupplier && (
                <SupplierCatalog
                  supplier={selectedSupplier}
                  products={catalogProducts}
                  onClose={() => setCatalogDrawerOpen(false)}
                  onEditSupplier={() => {
                    setCatalogDrawerOpen(false)
                    setTimeout(() => setEditDrawerOpen(true), 100)
                  }}
                />
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

function SupplierCard({ 
  supplier, 
  onViewCatalog, 
  onEdit 
}: { 
  supplier: Supplier; 
  onViewCatalog: () => void; 
  onEdit: () => void;
}) {
  return (
    <Card className="bg-white dark:bg-slate-800 shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{supplier.name}</h3>
        <div className="space-y-1 mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Account #: {supplier.accountNumber}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Phone: {supplier.phone}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Email: {supplier.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={onViewCatalog}>
            View Catalog
          </Button>
          <Button
            variant="outline"
            className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          >
            Order
          </Button>
          <Button
            variant="outline"
            className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            onClick={onEdit}
          >
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({ 
  title, 
  value, 
  textColor 
}: {
  title: string;
  value: string;
  textColor: string;
}) {
  return (
    <Card className="bg-white dark:bg-slate-800 shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
        <p className={`text-3xl font-bold mt-1 ${textColor}`}>{value}</p>
      </CardContent>
    </Card>
  )
}

function SupplierForm({ 
  supplier = null, 
  isEdit = false, 
  onCancel 
}: {
  supplier?: Supplier | null;
  isEdit?: boolean;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: supplier?.name || "",
    accountNumber: supplier?.accountNumber || "",
    status: supplier?.status || "Active",
    description: supplier?.description || "",
    contactName: supplier?.contactName || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    website: supplier?.website || "",
    address: supplier?.address || "",
    city: supplier?.city || "",
    state: supplier?.state || "",
    postalCode: supplier?.postalCode || "",
    isPreferred: supplier?.isPreferred || false,
    hasDirectOrdering: supplier?.hasDirectOrdering || false,
    hasAutoNotifications: supplier?.hasAutoNotifications || false,
    paymentTerms: supplier?.paymentTerms || "",
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would handle the form submission
    console.log("Form submitted:", formData)
    onCancel() // Close the drawer after submission
  }

  const handleDelete = () => {
    // Here you would handle the delete action
    console.log("Delete supplier:", supplier?.id)
    onCancel() // Close the drawer after deletion
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg">
        {isEdit && (
          <div className="mb-4">
            <h3 className="text-lg font-medium">Edit Supplier: {supplier?.name}</h3>
            <p className="text-sm text-gray-500">Account #: {supplier?.accountNumber} | Last updated: May 8, 2025</p>
          </div>
        )}
        {!isEdit && (
          <div className="mb-4">
            <h3 className="text-lg font-medium">Supplier Information</h3>
            <p className="text-sm text-gray-500">Add a new supplier to your vendor network</p>
          </div>
        )}

        <h4 className="font-medium mb-3">Basic Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-1">
            <Label htmlFor="supplierName">Supplier Name:</Label>
            <Input
              id="supplierName"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="accountNumber">Account Number:</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => handleChange("accountNumber", e.target.value)}
              placeholder="e.g., SUP001"
              className="mt-1"
            />
          </div>
          <div className="md:col-span-1">
            <Label htmlFor="status">Status:</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
              <SelectTrigger id="status" className="mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-6">
          <Label htmlFor="description">Description:</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="mt-1"
            rows={3}
          />
        </div>

        <h4 className="font-medium mb-3">Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="contactName">Contact Name:</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => handleChange("contactName", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone Number:</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="e.g., (800) 555-1234"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="email">Email:</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="e.g., orders@supplier.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="website">Website:</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="e.g., www.supplier.com"
              className="mt-1"
            />
          </div>
        </div>

        <h4 className="font-medium mb-3">Address</h4>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div>
            <Label htmlFor="address">Street Address:</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City:</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="state">State/Province:</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => handleChange("state", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="postalCode">Postal Code:</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg mb-6">
          <h4 className="font-medium mb-3">Additional Options</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPreferred"
                checked={formData.isPreferred}
                onCheckedChange={(checked) => handleChange("isPreferred", checked)}
              />
              <Label htmlFor="isPreferred">Preferred Supplier</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasDirectOrdering"
                checked={formData.hasDirectOrdering}
                onCheckedChange={(checked) => handleChange("hasDirectOrdering", checked)}
              />
              <Label htmlFor="hasDirectOrdering">Direct Order Integration</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasAutoNotifications"
                checked={formData.hasAutoNotifications}
                onCheckedChange={(checked) => handleChange("hasAutoNotifications", checked)}
              />
              <Label htmlFor="hasAutoNotifications">Send Auto Notifications</Label>
            </div>
            {isEdit && (
              <div className="mt-4">
                <Label htmlFor="paymentTerms">Default Payment Terms:</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange("paymentTerms", e.target.value)}
                  placeholder="e.g., Net 30"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        {isEdit ? (
          <>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              Save
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Back to Suppliers
            </Button>
          </>
        ) : (
          <>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              Save
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </form>
  )
}

function SupplierCatalog({ 
  supplier, 
  products, 
  onClose, 
  onEditSupplier 
}: {
  supplier: Supplier;
  products: Product[];
  onClose: () => void;
  onEditSupplier: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [sortBy, setSortBy] = useState("Name")
  const [activeTab, setActiveTab] = useState("Medications")

  const handleAddToOrder = (product: Product) => {
    // In a real app, this would add to cart or create order
    console.log("Add to order:", product);
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg mb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
          <div>
            <h3 className="text-lg font-medium">{supplier.name}</h3>
            <p className="text-sm text-gray-500">Account #: {supplier.accountNumber}</p>
          </div>
          <div className="mt-2 md:mt-0 text-sm">
            <p>Contact: {supplier.phone}</p>
            <p>{supplier.email}</p>
            <p>Last Order: May 13, 2025 (PO-482)</p>
          </div>
        </div>
        <div className="flex justify-between">
          <Button
            variant="outline"
            className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            onClick={onEditSupplier}
          >
            Edit Supplier
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white">Create New Order</Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="w-full md:w-48">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Category: All</SelectItem>
              <SelectItem value="Medications">Medications</SelectItem>
              <SelectItem value="Vaccines">Vaccines</SelectItem>
              <SelectItem value="Supplies">Medical Supplies</SelectItem>
              <SelectItem value="Diagnostics">Lab Diagnostics</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-48">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort By: Name" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Name">Sort By: Name</SelectItem>
              <SelectItem value="Price">Price: Low to High</SelectItem>
              <SelectItem value="PriceDesc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">Apply</Button>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">Order Items</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 dark:bg-slate-800 p-0 h-auto flex flex-wrap">
          <TabsTrigger
            value="Medications"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-none flex-1 py-2"
          >
            Medications
          </TabsTrigger>
          <TabsTrigger
            value="Vaccines"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-none flex-1 py-2"
          >
            Vaccines
          </TabsTrigger>
          <TabsTrigger
            value="MedicalSupplies"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-none flex-1 py-2"
          >
            Medical Supplies
          </TabsTrigger>
          <TabsTrigger
            value="FoodSupplements"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-none flex-1 py-2"
          >
            Food & Supplements
          </TabsTrigger>
          <TabsTrigger
            value="LabDiagnostics"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-none flex-1 py-2"
          >
            Lab Diagnostics
          </TabsTrigger>
          <TabsTrigger
            value="Equipment"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white rounded-none flex-1 py-2"
          >
            Equipment
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-800">
                  <th className="text-left p-3 border-b">Product Name</th>
                  <th className="text-left p-3 border-b">SKU</th>
                  <th className="text-left p-3 border-b">Category</th>
                  <th className="text-left p-3 border-b">Availability</th>
                  <th className="text-right p-3 border-b">Unit Price</th>
                  <th className="text-center p-3 border-b">Quantity</th>
                  <th className="text-center p-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="p-3">{product.name}</td>
                    <td className="p-3">{product.sku}</td>
                    <td className="p-3">{product.category}</td>
                    <td className="p-3">
                      <span className="text-green-600 font-medium">{product.availability}</span>
                    </td>
                    <td className="p-3 text-right">${product.unitPrice.toFixed(2)}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        min="1"
                        defaultValue={product.quantity}
                        className="w-20 mx-auto text-center"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        onClick={() => handleAddToOrder(product)}
                      >
                        Add to Order
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center mt-6">
            <p className="text-sm text-gray-500">Showing 1-5 of 468 products</p>
            <div className="flex">
              <Button variant="outline" className="rounded-l-md bg-purple-600 text-white hover:bg-purple-700">
                1
              </Button>
              <Button variant="outline" className="rounded-none border-l-0">
                2
              </Button>
              <Button variant="outline" className="rounded-none border-l-0">
                3
              </Button>
              <Button variant="outline" className="rounded-r-md border-l-0">
                →
              </Button>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
