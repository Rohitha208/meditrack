import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Filter, X } from "lucide-react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";

export type StockFilters = {
  search?: string
  batchNumber?: string
}

interface StockFilterDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  filters: StockFilters
  setFilters: (filters: StockFilters) => void
}

export function StockFilterDialog({ isOpen, onOpenChange, filters, setFilters }: StockFilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<StockFilters>(filters)

  const handleApply = () => {
    setFilters(localFilters)
    onOpenChange(false)
  }

  const handleClear = () => {
    setLocalFilters({})
    setFilters({})
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filter Stocks
                </DialogTitle>
              </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Product name..."
            value={localFilters.search || ""}
            onChange={e => setLocalFilters(f => ({ ...f, search: e.target.value }))}
          />
          <Input
            placeholder="Batch number..."
            value={localFilters.batchNumber || ""}
            onChange={e => setLocalFilters(f => ({ ...f, batchNumber: e.target.value }))}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={handleClear}>
            <X className="w-4 h-4 mr-1" /> Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
