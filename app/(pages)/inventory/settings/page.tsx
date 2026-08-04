"use client"

import { useState } from "react"
import { InventoryBreadcrumb } from "@/components/pawtrack/inventory/inventory-breadcrumb"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check } from "lucide-react"

export default function InventorySettingsPage() {
  const [activeTab, setActiveTab] = useState("reorder-points")
  const [searchQuery, setSearchQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  type ReorderPointsType = {
    [key: string]: { point: string; supplier: string }
  }
  
  const [reorderPoints, setReorderPoints] = useState<ReorderPointsType>({
    "cephalexin-500mg": { point: "10", supplier: "Covetrus" },
    "rimadyl-75mg": { point: "15", supplier: "Zoetis" },
    "rabies-vaccine": { point: "20", supplier: "Zoetis" },
    "syringes-3ml": { point: "25", supplier: "BD" },
    "heartworm-test-kits": { point: "10", supplier: "IDEXX" },
  })

  const handleReorderPointChange = (productId: string, value: string) => {
    setReorderPoints((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], point: value },
    }))
  }

  const handleSupplierChange = (productId: string, value: string) => {
    setReorderPoints((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], supplier: value },
    }))
  }

  const handleSaveAll = () => {
    // In a real app, this would save to the database
    console.log("Saving all changes:", reorderPoints)
    // Show success message
  }

  const handleReset = () => {
    // Reset to default values
    setReorderPoints({
      "cephalexin-500mg": { point: "10", supplier: "Covetrus" },
      "rimadyl-75mg": { point: "15", supplier: "Zoetis" },
      "rabies-vaccine": { point: "20", supplier: "Zoetis" },
      "syringes-3ml": { point: "25", supplier: "BD" },
      "heartworm-test-kits": { point: "10", supplier: "IDEXX" },
    })
  }

  return (
    <>
      <div className="p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Inventory Settings</h1>

        <Tabs defaultValue="reorder-points" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6 bg-gray-100 dark:bg-slate-800">
            <TabsTrigger
              value="reorder-points"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Reorder Points
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Suppliers
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              Categories
            </TabsTrigger>
            <TabsTrigger value="units" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              Units
            </TabsTrigger>
          </TabsList>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Category: All</SelectItem>
                  <SelectItem value="medications">Medications</SelectItem>
                  <SelectItem value="vaccines">Vaccines</SelectItem>
                  <SelectItem value="supplies">Medical Supplies</SelectItem>
                  <SelectItem value="diagnostics">Diagnostics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-64">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort By: Name" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort By: Name</SelectItem>
                  <SelectItem value="category">Sort By: Category</SelectItem>
                  <SelectItem value="stock">Sort By: Current Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">Apply</Button>
            <Button
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              Bulk Edit
            </Button>
          </div>

          <TabsContent value="reorder-points" className="mt-0">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Reorder Points Settings</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Configure minimum stock levels that trigger reorder alerts. The system will display low stock warnings
                when quantities fall below these thresholds.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Reorder Point
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Preferred Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Save
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                    <ReorderPointRow
                      id="cephalexin-500mg"
                      name="Cephalexin 500mg"
                      category="Medications"
                      stock={3}
                      reorderPoint={reorderPoints["cephalexin-500mg"].point}
                      supplier={reorderPoints["cephalexin-500mg"].supplier}
                      onReorderPointChange={handleReorderPointChange}
                      onSupplierChange={handleSupplierChange}
                    />
                    <ReorderPointRow
                      id="rimadyl-75mg"
                      name="Rimadyl 75mg"
                      category="Medications"
                      stock={5}
                      reorderPoint={reorderPoints["rimadyl-75mg"].point}
                      supplier={reorderPoints["rimadyl-75mg"].supplier}
                      onReorderPointChange={handleReorderPointChange}
                      onSupplierChange={handleSupplierChange}
                    />
                    <ReorderPointRow
                      id="rabies-vaccine"
                      name="Rabies Vaccine"
                      category="Vaccines"
                      stock={32}
                      reorderPoint={reorderPoints["rabies-vaccine"].point}
                      supplier={reorderPoints["rabies-vaccine"].supplier}
                      onReorderPointChange={handleReorderPointChange}
                      onSupplierChange={handleSupplierChange}
                    />
                    <ReorderPointRow
                      id="syringes-3ml"
                      name="Syringes 3ml"
                      category="Medical Supplies"
                      stock={12}
                      reorderPoint={reorderPoints["syringes-3ml"].point}
                      supplier={reorderPoints["syringes-3ml"].supplier}
                      onReorderPointChange={handleReorderPointChange}
                      onSupplierChange={handleSupplierChange}
                    />
                    <ReorderPointRow
                      id="heartworm-test-kits"
                      name="Heartworm Test Kits"
                      category="Diagnostics"
                      stock={4}
                      reorderPoint={reorderPoints["heartworm-test-kits"].point}
                      supplier={reorderPoints["heartworm-test-kits"].supplier}
                      onReorderPointChange={handleReorderPointChange}
                      onSupplierChange={handleSupplierChange}
                    />
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500 dark:text-gray-400">Showing 1-5 of 423 products</div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700 w-10 h-10 p-0">
                  1
                </Button>
                <Button
                  variant="outline"
                  className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10 p-0"
                >
                  2
                </Button>
                <Button
                  variant="outline"
                  className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-10 h-10 p-0"
                >
                  →
                </Button>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSaveAll}>
                Save All Changes
              </Button>
              <Button
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={handleReset}
              >
                Reset to Default
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="suppliers" className="mt-0">
            <div className="bg-gray-100 dark:bg-slate-800 p-8 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">Suppliers Settings</h3>
              <p className="text-gray-500 dark:text-gray-400">This tab will contain supplier management settings.</p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <div className="bg-gray-100 dark:bg-slate-800 p-8 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">Notifications Settings</h3>
              <p className="text-gray-500 dark:text-gray-400">
                This tab will contain notification preferences and settings.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <div className="bg-gray-100 dark:bg-slate-800 p-8 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">Categories Settings</h3>
              <p className="text-gray-500 dark:text-gray-400">This tab will contain inventory category management.</p>
            </div>
          </TabsContent>

          <TabsContent value="units" className="mt-0">
            <div className="bg-gray-100 dark:bg-slate-800 p-8 rounded-lg text-center">
              <h3 className="text-xl font-semibold mb-2">Units Settings</h3>
              <p className="text-gray-500 dark:text-gray-400">This tab will contain unit of measurement settings.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

function ReorderPointRow({
  id,
  name,
  category,
  stock,
  reorderPoint,
  supplier,
  onReorderPointChange,
  onSupplierChange,
}: {
  id: string;
  name: string;
  category: string;
  stock: number;
  reorderPoint: string;
  supplier: string;
  onReorderPointChange: (id: string, value: string) => void;
  onSupplierChange: (id: string, value: string) => void;
}) {
  const stockSeverity =
    stock <= Number.parseInt(reorderPoint) * 0.25
      ? "text-red-600"
      : stock <= Number.parseInt(reorderPoint) * 0.5
        ? "text-amber-600"
        : "text-gray-900 dark:text-gray-200"

  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{category}</td>
      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${stockSeverity}`}>{stock}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Input
          type="number"
          min="1"
          className="w-24 h-9"
          value={reorderPoint}
          onChange={(e) => onReorderPointChange(id, e.target.value)}
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Input className="w-40 h-9" value={supplier} onChange={(e) => onSupplierChange(id, e.target.value)} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Button size="sm" className="w-9 h-9 p-0 bg-purple-600 hover:bg-purple-700 text-white">
          <Check className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}
