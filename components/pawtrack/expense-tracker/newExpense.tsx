'use client'
import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { useCreateExpense, CreateExpenseData } from "@/queries/expense/create-expense";

import { useRootContext } from "@/context/RootContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseFormSchema, ExpenseFormValues } from "@/components/pawtrack/schema/expense-schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";
import { toast } from "sonner";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";

interface NewExpenseProps {
  onSuccess: () => void;
}

export default function NewExpense({ onSuccess }: NewExpenseProps) {
  const { user, userType, clinic } = useRootContext();
  
  const createExpense = useCreateExpense();

  // 🔑 IDs based on role
  const companyId = userType?.isAdmin ? user?.companyId : null;
  const defaultClinicId = !userType?.isAdmin 
    ? (clinic?.id || localStorage.getItem("clinicId") || "") 
    : "";

  // ✅ Fetch clinics only for admin
  const { data: clinics } = useGetClinic(1, 100, companyId, !!companyId);

  // 🔑 Options for clinic dropdown
  const clinicOptions = useMemo(() => {
    if (!clinics?.items) return [];
    return clinics.items
      .filter((c: any) => !companyId || c.companyId === companyId)
      .map((c: any) => ({ value: c.id, label: c.name }));
  }, [clinics, companyId]);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      clinicId: userType?.isAdmin ? "" : defaultClinicId,
      dateOfExpense: new Date().toISOString(),
      category: "",
      amount: 0,
      paymentMode: "",
      paidTo: "",
      description: ""
    }
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const isSubmitting = form.formState.isSubmitting;

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      form.setValue("dateOfExpense", date.toISOString(), { shouldValidate: true });
    }
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      await createExpense.mutateAsync(values);
      toast("Expense created successfully");
      onSuccess();
    } catch (error) {
      toast.error(getToastErrorMessage(error, "Failed to create expense"));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Show clinic dropdown only for Admin */}
        <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
        {userType?.isAdmin ? (
          <FormField
            control={form.control}
            name="clinicId"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Clinic *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clinicOptions.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage/>
              </FormItem>
            )}
          />
        ) : (
          <input type="hidden" name="clinicId" value={defaultClinicId} />
        )}

        <FormField
          control={form.control}
          name="dateOfExpense"
          render={({ field }) => (
            <FormItem className="flex flex-col mb-2 mt-3">
              <FormLabel className="mb-2">Date *</FormLabel>
              <FormControl>
                <DatePicker
                  selected={selectedDate}
                  onChange={(date: Date | null) => {
                    if (date) handleDateSelect(date);
                  }}
                  maxDate={new Date()}
                  placeholderText="dd/mm/yyyy"
                  dateFormat="dd/MM/yyyy"
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  className="w-full h-10 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Category *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Office Supplies, Rent, Utilities"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter expense description"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Amount *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentMode"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Payment Mode *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Cash, Credit Card, Bank Transfer"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paidTo"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Paid To *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Vendor, Staff, Utility Provider"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onSuccess}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D] hover:text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Expense"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
