"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart, DownloadIcon, FileText, Plus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function PatientLabResults() {
  const [searchTerm, setSearchTerm] = useState("")
  const [testType, setTestType] = useState("all")
  const [dateRange, setDateRange] = useState("all")

  const labResults = [
    {
      id: 1,
      date: "May 1, 2025",
      type: "Blood Chemistry Panel",
      status: "normal",
      lab: "VetLab Services",
      notes: "All parameters within normal ranges. No abnormalities detected.",
    },
    {
      id: 2,
      date: "May 1, 2025",
      type: "Complete Blood Count",
      status: "normal",
      lab: "VetLab Services",
      notes: "All parameters within normal ranges. No abnormalities detected.",
    },
    {
      id: 3,
      date: "Jan 15, 2025",
      type: "Heartworm Test",
      status: "normal",
      lab: "InHouse",
      notes: "Negative for heartworm antigen.",
    },
    {
      id: 4,
      date: "Nov 10, 2024",
      type: "Urinalysis",
      status: "abnormal",
      lab: "VetLab Services",
      notes: "Elevated proteins. Slight increase in bacteria. Recommend follow-up in 2 weeks.",
    },
    {
      id: 5,
      date: "Nov 10, 2024",
      type: "Fecal Exam",
      status: "abnormal",
      lab: "InHouse",
      notes: "Positive for Giardia. Treatment prescribed.",
    },
  ]

  const filteredResults = labResults.filter((result) => {
    const matchesSearch = searchTerm === "" || 
                          result.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          result.lab.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          result.notes.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = testType === "all" || result.type.toLowerCase().includes(testType.toLowerCase())
    
    const matchesDate = dateRange === "all" || 
                       (dateRange === "recent" && ["May 1, 2025", "Jan 15, 2025"].includes(result.date)) ||
                       (dateRange === "older" && ["Nov 10, 2024"].includes(result.date))
    
    return matchesSearch && matchesType && matchesDate
  })

  return (
    <div className="space-y-6">
      {/* Highlighted Recent Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Normal Result */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Blood Chemistry Panel</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">May 1, 2025</p>
              </div>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Normal</Badge>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              All parameters within normal ranges. No abnormalities detected.
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">VetLab Services</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center">
                  <BarChart className="mr-1 h-3.5 w-3.5" />
                  View Trends
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center">
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Full Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Abnormal Result */}
        <Card className="bg-white dark:bg-slate-800 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Urinalysis</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Nov 10, 2024</p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">Abnormal</Badge>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Elevated proteins. Slight increase in bacteria. Recommend follow-up in 2 weeks.
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">VetLab Services</span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center">
                  <BarChart className="mr-1 h-3.5 w-3.5" />
                  View Trends
                </Button>
                <Button variant="outline" size="sm" className="h-8 px-2 text-xs flex items-center">
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Full Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Lab Results */}
      <Card className="bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lab Results</h3>
            <Button className="theme-button text-white">
              <Plus className="mr-2 h-4 w-4" /> New Lab Result
            </Button>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Label htmlFor="search-lab-results" className="sr-only">Search</Label>
              <Input
                id="search-lab-results"
                placeholder="Search lab results..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            <div>
              <Label htmlFor="test-type-filter" className="sr-only">Test Type</Label>
              <Select value={testType} onValueChange={setTestType}>
                <SelectTrigger id="test-type-filter">
                  <SelectValue placeholder="All Test Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Test Types</SelectItem>
                  <SelectItem value="blood">Blood Tests</SelectItem>
                  <SelectItem value="urine">Urinalysis</SelectItem>
                  <SelectItem value="fecal">Fecal Exams</SelectItem>
                  <SelectItem value="heartworm">Heartworm Tests</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-range-filter" className="sr-only">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range-filter">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="recent">Last 6 Months</SelectItem>
                  <SelectItem value="older">Older Than 6 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results List */}
          <Tabs defaultValue="list" className="w-full">
            <div className="px-4 pt-4">
              <TabsList>
                <TabsTrigger value="list">List View</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="list" className="p-0 mt-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Test Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Lab
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {filteredResults.map((result) => (
                      <tr key={result.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {result.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {result.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {result.status === "normal" ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                              Normal
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                              Abnormal
                            </Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                          {result.lab}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 max-w-md">
                          {result.notes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <FileText className="h-3.5 w-3.5" />
                              <span className="sr-only">View Report</span>
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <DownloadIcon className="h-3.5 w-3.5" />
                              <span className="sr-only">Download</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredResults.length === 0 && (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <p>No lab results match your search criteria.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="trends" className="px-6 py-8">
              <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-gray-500 dark:text-gray-400">
                <BarChart className="h-12 w-12 mb-2" />
                <p className="text-sm">Trends view would be displayed here</p>
                <p className="text-xs mt-1">Showing comparative analysis of lab results over time</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 