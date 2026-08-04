"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

export function NewPrescriptionForm() {
  const [open, setOpen] = useState(false)
  const [colorTheme, setColorTheme] = useState("purple")
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    patient: "",
    medication: "",
    dosage: "",
    quantity: "",
    instructions: "",
    prescriber: "",
  })

  // Ensure we only access localStorage on the client side
  useEffect(() => {
    setMounted(true)
    const savedColorTheme = localStorage.getItem("pawtrack-color-theme") || "purple"
    setColorTheme(savedColorTheme)
  }, [])

  // Don't render until after component has mounted on the client
  if (!mounted) return <Button className="theme-button text-white">
    <Plus className="mr-2 h-4 w-4" /> New Prescription
  </Button>

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setOpen(false)
    // Reset form
    setFormData({
      patient: "",
      medication: "",
      dosage: "",
      quantity: "",
      instructions: "",
      prescriber: "",
    })
  }

  // Define options for Combobox components
  const patientOptions = [
    { value: "max", label: "Max (Golden Retriever)" },
    { value: "bella", label: "Bella (Siamese Cat)" },
    { value: "charlie", label: "Charlie (Labrador)" },
    { value: "daisy", label: "Daisy (Rabbit)" },
    { value: "oscar", label: "Oscar (Maine Coon)" },
  ]

  const prescriberOptions = [
    { value: "dr-johnson", label: "Dr. Johnson" },
    { value: "dr-martinez", label: "Dr. Martinez" },
    { value: "dr-wilson", label: "Dr. Wilson" },
  ]

  const medicationOptions = [
    { value: "amoxicillin", label: "Amoxicillin 250mg" },
    { value: "doxycycline", label: "Doxycycline 100mg" },
    { value: "prednisone", label: "Prednisone 5mg" },
    { value: "enrofloxacin", label: "Enrofloxacin 15mg" },
    { value: "famotidine", label: "Famotidine 10mg" },
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="theme-button text-white">
          <Plus className="mr-2 h-4 w-4" /> New Prescription
        </Button>
      </SheetTrigger>
      <SheetContent className={`theme-${colorTheme} w-[600px] sm:max-w-[600px]`}>
        <SheetHeader>
          <SheetTitle className="text-xl theme-text-primary">Create New Prescription</SheetTitle>
          <SheetDescription>Fill out the form below to create a new prescription</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patient" className="text-gray-500 dark:text-gray-400">
                Patient
              </Label>
              <Combobox
                options={patientOptions}
                value={formData.patient}
                onValueChange={(value) => handleChange("patient", value)}
                placeholder="Select patient"
              />
            </div>
            <div>
              <Label htmlFor="prescriber" className="text-gray-500 dark:text-gray-400">
                Prescriber
              </Label>
              <Combobox
                options={prescriberOptions}
                value={formData.prescriber}
                onValueChange={(value) => handleChange("prescriber", value)}
                placeholder="Select prescriber"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="medication" className="text-gray-500 dark:text-gray-400">
              Medication
            </Label>
            <Combobox
              options={medicationOptions}
              value={formData.medication}
              onValueChange={(value) => handleChange("medication", value)}
              placeholder="Select medication"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dosage" className="text-gray-500 dark:text-gray-400">
                Dosage
              </Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => handleChange("dosage", e.target.value)}
                placeholder="e.g., 1 tablet twice daily"
                required
              />
            </div>
            <div>
              <Label htmlFor="quantity" className="text-gray-500 dark:text-gray-400">
                Quantity
              </Label>
              <Input
                id="quantity"
                value={formData.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
                placeholder="e.g., 20 tablets"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="instructions" className="text-gray-500 dark:text-gray-400">
              Instructions
            </Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => handleChange("instructions", e.target.value)}
              placeholder="Enter detailed instructions..."
              className="resize-none"
              required
            />
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="theme-button text-white">
              Create Prescription
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
} 