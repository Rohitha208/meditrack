import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Control } from "react-hook-form";
import { useRootContext } from '@/context/RootContext';
import { useGetClients } from "@/queries/clients/get-client"
import { getCompanyId } from "@/utils/clientCookie"

interface ClientSelectProps {
  control: Control<any>;
  name: string;
  label?: string;
  description?: string;
  onAddNewClick?: () => void;
  disabled?: boolean;
}

export function ClientSelect({
  control,
  name,
  label = "Owner",
  description,
  onAddNewClick,
  disabled = false,
}: ClientSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{id: string, name: string} | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Resolve companyId from storage or context
  const { user } = useRootContext();
  const companyId = (typeof window !== 'undefined' && getCompanyId()) || user?.companyId || '';

  // Use the updated hook to get clients with search
  const { data: clientsData, isLoading, isError } = useGetClients(
    1, 100, debouncedSearch, 'first_name', companyId, !!debouncedSearch
  );
  // Always use items array from the response
  const clients = clientsData?.items || [];

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <div className="relative">
              <Command className="rounded-md border overflow-visible">
                <CommandInput 
                  placeholder="Search owners..." 
                  value={searchQuery}
                  onValueChange={(value) => {
                    setSearchQuery(value);
                    // Clear selection when typing
                    if (selectedClient && value !== selectedClient.name) {
                      setSelectedClient(null);
                    }
                  }}
                  disabled={disabled}
                  className="focus:ring-0 focus:ring-offset-0"
                />
                {(debouncedSearch || isLoading) && (
                  <CommandList className="absolute top-full left-0 w-full z-50 rounded-md border mt-1 bg-popover">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : isError ? (
                      <div className="py-6 text-center text-sm">
                        <p className="text-destructive">Error loading owners.</p>
                      </div>
                    ) : clients.length === 0 ? (
                      <CommandEmpty>No owner found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={`${client.firstName} ${client.lastName} ${client.email}`.toLowerCase()}
                            onSelect={() => {
                              field.onChange(client.id);
                              setSelectedClient({
                                id: client.id,
                                name: `${client.firstName} ${client.lastName}`
                              });
                              setSearchQuery(`${client.firstName} ${client.lastName}`);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                client.id === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {client.firstName} {client.lastName}
                            <span className="ml-2 text-muted-foreground text-xs">
                              {client.email}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                )}
              </Command>
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
} 