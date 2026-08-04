"use client"

import { Card, CardContent } from "@/components/ui/card"

export function ExpirationReport() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Expiring Items */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Expiring Items</h3>
            <p className="text-4xl font-bold text-purple-600">12</p>
            <p className="text-sm text-red-600 mt-2">Expiring within 30 days</p>
          </CardContent>
        </Card>

        {/* Value of Expiring Items */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Value of Expiring Items</h3>
            <p className="text-4xl font-bold text-purple-600">₹270.00</p>
            <p className="text-sm text-red-600 mt-2">Potential loss</p>
          </CardContent>
        </Card>

        {/* Top Expiring Category */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Top Expiring Category</h3>
            <p className="text-4xl font-bold text-purple-600">Vaccines</p>
            <p className="text-sm text-gray-600 mt-2">Most items expiring</p>
          </CardContent>
        </Card>
      </div>

      {/* Expiration Table */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Items Expiring Soon</h3>
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
                    Expiration Date
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                <ExpirationItem
                  product="Rabies Vaccine"
                  category="Vaccines"
                  expiration="May 22, 2025"
                  quantity={5}
                  value="₹56.25"
                />
                <ExpirationItem
                  product="DHPPC Vaccine"
                  category="Vaccines"
                  expiration="June 15, 2025"
                  quantity={3}
                  value="₹33.75"
                />
                <ExpirationItem
                  product="Feline Leukemia Vaccine"
                  category="Vaccines"
                  expiration="June 28, 2025"
                  quantity={4}
                  value="₹45.00"
                />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type ExpirationItemProps = {
  product: string;
  category: string;
  expiration: string;
  quantity: number;
  value: string;
}

function ExpirationItem({ product, category, expiration, quantity, value }: ExpirationItemProps) {
  return (
    <tr>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{product}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{category}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600 dark:text-red-400">{expiration}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{quantity}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{value}</td>
    </tr>
  )
}
