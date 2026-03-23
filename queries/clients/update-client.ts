import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getMessageFromErrorBody, getToastErrorMessage } from "@/utils/apiErrorHandler";
import { Client } from "./get-client";

interface UpdateClientPayload {
  id: string;
  companyId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phonePrimary: string;
  phoneSecondary?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  isActive: boolean;
  isPremium: boolean;
}

const updateClient = async (clientData: UpdateClientPayload): Promise<Client> => {
  const response = await fetch(`/api/clients/${clientData.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(clientData),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = getMessageFromErrorBody(result, 'Failed to update client');
    throw new Error(message);
  }
  return result as Client;
};

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateClient,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to update owner"),
        variant: "destructive",
      });
    },
  });
} 