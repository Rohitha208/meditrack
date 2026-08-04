'use client'
import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useUpdateExpense, UpdateExpenseData } from "@/queries/expense/update-expense";
import { useGetExpenseById } from "@/queries/expense/get-expense-by-id";
import { useToast } from "@/hooks/use-toast";
import { useRootContext } from "@/context/RootContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Loader from "../../ui/loader";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { expenseFormSchema, ExpenseFormValues } from "@/components/pawtrack/schema/expense-schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../../ui/form";

interface ExpenseDetailsProps {
  expenseId: string;
  onSuccess: () => void;
}

export default function ExpenseDetails({ expenseId, onSuccess }: ExpenseDetailsProps) {
  const { clinic, user, userType } = useRootContext();
  const { toast } = useToast();
  const updateExpense = useUpdateExpense();

  const companyId = userType?.isAdmin ? user?.companyId : null;
  const defaultClinicId = !userType?.isAdmin 
    ? (clinic?.id || localStorage.getItem("clinicId") || "") 
    : "";

  // ✅ Fetch clinics if admin
  const { data: clinics } = useGetClinic(1, 100, companyId, !!companyId);

  const clinicOptions = useMemo(() => {
    if (!clinics?.items) return [];
    return clinics.items
      .filter((c: any) => !companyId || c.companyId === companyId)
      .map((c: any) => ({ value: c.id, label: c.name }));
  }, [clinics, companyId]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Initialize form
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

  // Fetch expense by ID
  const { data: expense, isLoading } = useGetExpenseById(expenseId, Boolean(expenseId));

  // Set form values when expense data is loaded
  useEffect(() => {
    if (expense) {
      const expenseDate = new Date(expense.dateOfExpense);
      setSelectedDate(expenseDate);
      
      // Determine the clinic ID to use
      const clinicId = userType?.isAdmin 
        ? (expense.clinicId || defaultClinicId || "") 
        : (defaultClinicId || expense.clinicId || "");
      
      // Reset form with all values
      form.reset({
        clinicId: clinicId,
        dateOfExpense: expense.dateOfExpense,
        category: expense.category,
        amount: expense.amount,
        paymentMode: expense.paymentMode || "",
        paidTo: expense.paidTo || "",
        description: expense.description || ""
      });
      
      // Force update the form state to ensure clinicId is set
      if (clinicId) {
        setTimeout(() => {
          form.setValue('clinicId', clinicId, { shouldValidate: true });
        }, 0);
      }
    }
  }, [expense, userType, defaultClinicId, form]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      form.setValue("dateOfExpense", date.toISOString(), { shouldValidate: true });
    }
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      await updateExpense.mutateAsync({ ...values, id: expenseId });
      toast({
        title: "Success",
        description: "Expense updated successfully",
        variant: "success",
      });
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update expense",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="h-[calc(100vh-10rem)] overflow-y-auto p-4 border rounded-md">
        {/* Clinic ID (hidden for non-admin) */}
        {userType?.isAdmin ? (
          <FormField
            control={form.control}
            name="clinicId"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Clinic *</FormLabel>
                <Select 
                  value={field.value || ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('clinicId', value, { shouldValidate: true });
                  }}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select clinic" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clinicOptions.map((clinic) => (
                      <SelectItem key={clinic.value} value={clinic.value}>
                        {clinic.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <input type="hidden" name="clinicId" value={form.getValues("clinicId")} />
        )}

        {/* Date Picker */}
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

        {/* Category */}
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

        {/* Amount */}
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

        {/* Payment Mode */}
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
        <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onSuccess} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <div>
          <Button type="submit" className="flex-1 theme-button text-white w-fit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Expense"
            )}
          </Button>
          </div>
         
        </div>
      </form>
      
    </Form>
  );
}
