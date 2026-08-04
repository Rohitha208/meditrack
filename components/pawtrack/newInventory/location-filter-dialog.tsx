"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export interface LocationFilters {
  search?: string
  shelf?: string
  bin?: string
  batchNumber?: string
  hasLocation?: boolean
}

interface LocationFilterDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  filters: LocationFilters
  setFilters: (filters: LocationFilters) => void
}

export default function LocationFilterDialog({
  isOpen,
  onOpenChange,
  filters,
  setFilters,
}: LocationFilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<LocationFilters>(filters)

  const handleApplyFilters = () => {
    setFilters(localFilters)
    onOpenChange(false)
  }

  const handleClearFilters = () => {
    const clearedFilters: LocationFilters = {}
    setLocalFilters(clearedFilters)
    setFilters(clearedFilters)
    onOpenChange(false)
  }

  const handleReset = () => {
    setLocalFilters(filters)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Batch Locations</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Search by product name, batch number..."
              value={localFilters.search || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, search: e.target.value })}
            />
          </div>

          {/* Shelf */}
          <div className="space-y-2">
            <Label htmlFor="shelf">Shelf</Label>
            <Input
              id="shelf"
              placeholder="e.g., A, B, 1, 2"
              value={localFilters.shelf || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, shelf: e.target.value })}
            />
          </div>

          {/* Bin */}
          <div className="space-y-2">
            <Label htmlFor="bin">Bin</Label>
            <Input
              id="bin"
              placeholder="e.g., 01, 02, 15"
              value={localFilters.bin || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, bin: e.target.value })}
            />
          </div>

          {/* Batch Number */}
          <div className="space-y-2">
            <Label htmlFor="batchNumber">Batch Number</Label>
            <Input
              id="batchNumber"
              placeholder="Enter batch number"
              value={localFilters.batchNumber || ""}
              onChange={(e) => setLocalFilters({ ...localFilters, batchNumber: e.target.value })}
            />
          </div>


          {/* Has Location */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasLocation"
              checked={localFilters.hasLocation === true}
              onCheckedChange={(checked) => 
                setLocalFilters({ ...localFilters, hasLocation: checked ? true : undefined })
              }
            />
                         <Label htmlFor="hasLocation">Only show batches with assigned locations</Label>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear All
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 