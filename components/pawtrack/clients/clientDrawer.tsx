import { ClientForm } from "./client-form";
import { Client } from "@/queries/clients/get-client";

interface ClientDrawerContentProps {
  onClose: () => void;
  defaultValues?: Client;
  isUpdate?: boolean;
  isClientContext?: boolean;
}

export function ClientDrawerContent({ onClose, defaultValues, isUpdate, isClientContext }: ClientDrawerContentProps) {
  return (
    <div className="">
      <ClientForm 
        onSuccess={onClose} 
        defaultValues={defaultValues} 
        isUpdate={isUpdate || !!defaultValues}
        onCancel={onClose}
         isClientContext={isClientContext}
      />
    </div>
  );
} 