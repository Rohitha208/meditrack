"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function ProcessPayment({ open, onClose }: { open: boolean, onClose: () => void }) {
  const [paymentMethod, setPaymentMethod] = useState("credit-card")

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className={`text-xl font-bold theme-text-primary`}>Process Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="invoice">Select Invoice</Label>
            <Select>
              <SelectTrigger id="invoice">
                <SelectValue placeholder="Select invoice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inv-12345">INV-12345 - John Smith - $125.00</SelectItem>
                <SelectItem value="inv-12343">INV-12343 - Robert Thompson - $245.75</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Payment Amount</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">$</div>
              <Input id="amount" type="number" min="0" step="0.01" defaultValue="125.00" className="pl-6" />
            </div>
          </div>

          <div>
            <Label>Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex flex-col space-y-1 mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit-card" id="credit-card" />
                <Label htmlFor="credit-card" className="cursor-pointer">
                  Credit Card
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="cursor-pointer">
                  Cash
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="check" id="check" />
                <Label htmlFor="check" className="cursor-pointer">
                  Check
                </Label>
              </div>
            </RadioGroup>
          </div>

          {paymentMethod === "credit-card" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="•••• •••• •••• ••••" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="•••" />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "check" && (
            <div>
              <Label htmlFor="check-number">Check Number</Label>
              <Input id="check-number" />
            </div>
          )}

          <div>
            <Label htmlFor="payment-note">Note (Optional)</Label>
            <Input id="payment-note" placeholder="Add a note to this payment" />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className={`theme-button text-white`}>Process Payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 