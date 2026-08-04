import { useState, useEffect } from "react";
import { useGetClinics } from "@/queries/clinics/get-clinics";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";

interface ClinicSelectProps {
  control: Control<any>;
  name: string;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function ClinicSelect({
  control,
  name,
  label = "Clinic",
  description,
  disabled = false,
}: ClinicSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const { data: clinicsData, isLoading, isError, refetch } = useGetClinics(debouncedSearch);
  const clinics = clinicsData?.items || [];

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    "w-full justify-between",
                    !field.value && "text-muted-foreground"
                  )}
                  disabled={disabled}
                >
                  {field.value ? (
                    clinics?.find((clinic) => clinic.id === field.value)
                      ? clinics.find((clinic) => clinic.id === field.value)?.name
                      : "Select clinic"
                  ) : (
                    "Select clinic"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput 
                  placeholder="Search clinics..." 
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : isError ? (
                    <div className="py-6 text-center text-sm">
                      <p className="text-destructive">Error loading clinics.</p>
                      <Button
                        variant="link"
                        onClick={() => refetch()}
                        className="mt-2"
                      >
                        Try again
                      </Button>
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>
                        <div className="py-6 text-center text-sm">
                          <p>No clinic found.</p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {clinics?.map((clinic) => (
                          <CommandItem
                            key={clinic.id}
                            value={clinic.id}
                            onSelect={() => {
                              field.onChange(clinic.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                clinic.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {clinic.name}
                            <span className="ml-2 text-muted-foreground text-xs">
                              {clinic.city}, {clinic.state}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
} 