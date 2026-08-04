import { Card, CardContent } from "@/components/ui/card"

export function UsageReport() {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Items Used */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Total Items Used</h3>
            <p className="text-4xl font-bold text-purple-600">278</p>
            <p className="text-sm text-green-600 mt-2">+12% from previous period</p>
          </CardContent>
        </Card>

        {/* Usage Value */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Usage Value</h3>
            <p className="text-4xl font-bold text-purple-600">$4,286.50</p>
            <p className="text-sm text-green-600 mt-2">+5.8% from previous period</p>
          </CardContent>
        </Card>

        {/* Top Category */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Top Category</h3>
            <p className="text-4xl font-bold text-purple-600">Medications</p>
            <p className="text-sm text-gray-600 mt-2">42% of total usage</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Usage Trend Chart */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Daily Usage Trend</h3>
          </div>
          <div className="h-64 w-full">
            <DailyUsageTrendChart />
          </div>
        </CardContent>
      </Card>

      {/* Usage by Category and Top Used Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Usage by Category */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Usage by Category</h3>
            <div className="flex items-center justify-center">
              <div className="w-48 h-48">
                <UsageByCategoryChart />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                <span>Medications (42%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span>Medical Supplies (28%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span>Vaccines (18%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span>Food & Supplements (12%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Used Items */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Used Items</h3>
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
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  <TopUsedItem
                    product="Cephalexin 500mg"
                    category="Medications"
                    quantity={36}
                    value="$567.00"
                    percentage="13.2%"
                  />
                  <TopUsedItem
                    product="Syringes 3ml"
                    category="Supplies"
                    quantity={125}
                    value="$93.75"
                    percentage="2.2%"
                  />
                  <TopUsedItem
                    product="Rabies Vaccine"
                    category="Vaccines"
                    quantity={24}
                    value="$270.00"
                    percentage="6.3%"
                  />
                  <TopUsedItem
                    product="Rimadyl 75mg"
                    category="Medications"
                    quantity={22}
                    value="$346.50"
                    percentage="8.1%"
                  />
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

type TopUsedItemProps = {
  product: string;
  category: string;
  quantity: number;
  value: string;
  percentage: string;
}

function TopUsedItem({ product, category, quantity, value, percentage }: TopUsedItemProps) {
  return (
    <tr>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{product}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{category}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{quantity}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{value}</td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">{percentage}</td>
    </tr>
  )
}

function DailyUsageTrendChart() {
  return (
    <svg viewBox="0 0 800 300" className="w-full h-full">
      {/* X and Y axes */}
      <line x1="50" y1="250" x2="750" y2="250" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="50" y1="50" x2="50" y2="250" stroke="#e2e8f0" strokeWidth="2" />

      {/* X-axis labels */}
      <text x="50" y="270" fontSize="12" textAnchor="middle" fill="currentColor">
        May 1
      </text>
      <text x="190" y="270" fontSize="12" textAnchor="middle" fill="currentColor">
        May 5
      </text>
      <text x="330" y="270" fontSize="12" textAnchor="middle" fill="currentColor">
        May 10
      </text>
      <text x="470" y="270" fontSize="12" textAnchor="middle" fill="currentColor">
        May 15
      </text>
      <text x="610" y="270" fontSize="12" textAnchor="middle" fill="currentColor">
        May 20
      </text>
      <text x="750" y="270" fontSize="12" textAnchor="middle" fill="currentColor">
        May 30
      </text>

      {/* Y-axis labels */}
      <text x="40" y="250" fontSize="12" textAnchor="end" fill="currentColor">
        0
      </text>
      <text x="40" y="200" fontSize="12" textAnchor="end" fill="currentColor">
        10
      </text>
      <text x="40" y="150" fontSize="12" textAnchor="end" fill="currentColor">
        20
      </text>
      <text x="40" y="100" fontSize="12" textAnchor="end" fill="currentColor">
        30
      </text>
      <text x="40" y="50" fontSize="12" textAnchor="end" fill="currentColor">
        40
      </text>

      {/* Grid lines */}
      <line x1="50" y1="200" x2="750" y2="200" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
      <line x1="50" y1="150" x2="750" y2="150" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
      <line x1="50" y1="100" x2="750" y2="100" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />
      <line x1="50" y1="50" x2="750" y2="50" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" />

      {/* Medications line */}
      <polyline
        points="
          50,230
          120,210
          190,220
          260,190
          330,200
          400,180
          470,170
          540,160
          610,150
          680,130
          750,140
        "
        fill="none"
        stroke="#1E3D3D"
        strokeWidth="3"
      />

      {/* Supplies line */}
      <polyline
        points="
          50,240
          120,230
          190,225
          260,220
          330,215
          400,210
          470,205
          540,210
          610,190
          680,200
          750,195
        "
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
      />

      {/* Legend */}
      <rect x="600" y="30" width="10" height="10" fill="#1E3D3D" />
      <text x="620" y="40" fontSize="12" fill="currentColor">
        Medications
      </text>
      <rect x="700" y="30" width="10" height="10" fill="#10b981" />
      <text x="720" y="40" fontSize="12" fill="currentColor">
        Supplies
      </text>
    </svg>
  )
}

function UsageByCategoryChart() {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {/* Medications (42%) */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#1E3D3D"
        strokeWidth="20"
        strokeDasharray="151.2 100.8"
        strokeDashoffset="0"
      />

      {/* Medical Supplies (28%) */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#10b981"
        strokeWidth="20"
        strokeDasharray="100.8 151.2"
        strokeDashoffset="-151.2"
      />

      {/* Vaccines (18%) */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#3b82f6"
        strokeWidth="20"
        strokeDasharray="64.8 187.2"
        strokeDashoffset="-252"
      />

      {/* Food & Supplements (12%) */}
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke="#ef4444"
        strokeWidth="20"
        strokeDasharray="43.2 208.8"
        strokeDashoffset="-316.8"
      />
    </svg>
  )
}
