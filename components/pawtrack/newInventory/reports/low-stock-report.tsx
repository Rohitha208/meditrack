"use client"

import { Card, CardContent } from "@/components/ui/card"

export function LowStockReport() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Low Stock Items */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Low Stock Items</h3>
            <p className="text-4xl font-bold text-purple-600">23</p>
            <p className="text-sm text-red-600 mt-2">Below reorder point</p>
          </CardContent>
        </Card>

        {/* Value of Low Stock Items */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Value of Low Stock Items</h3>
            <p className="text-4xl font-bold text-purple-600">₹428.75</p>
            <p className="text-sm text-amber-600 mt-2">Potential reorder cost</p>
          </CardContent>
        </Card>

        {/* Top Low Stock Category */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Top Low Stock Category</h3>
            <p className="text-4xl font-bold text-purple-600">Medications</p>
            <p className="text-sm text-gray-600 mt-2">Most items below reorder point</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Items Below Reorder Point</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Current Stock
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reorder Point
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                <LowStockItem
                  product="Cephalexin 500mg"
                  category="Medications"
                  current={3}
                  reorderPoint={10}
                  value="₹47.25"
                />
                <LowStockItem
                  product="Heartworm Test Kit"
                  category="Diagnostics"
                  current={4}
                  reorderPoint={10}
                  value="₹102.00"
                />
                <LowStockItem
                  product="Rimadyl 75mg"
                  category="Medications"
                  current={5}
                  reorderPoint={15}
                  value="₹171.25"
                />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type LowStockItemProps = {
  product: string;
  category: string;
  current: number;
  reorderPoint: number;
  value: string;
}

function LowStockItem({ product, category, current, reorderPoint, value }: LowStockItemProps) {
  return (
    <tr>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{product}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{category}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 dark:text-red-400">{current}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{reorderPoint}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{value}</td>
    </tr>
  )
}
