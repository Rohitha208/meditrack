import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { getMessageFromErrorBody, getToastErrorMessage } from "@/utils/apiErrorHandler";
import { Client } from "./get-client";

interface CreateClientPayload {
  companyId: string;
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

const createClient = async (clientData: CreateClientPayload): Promise<Client> => {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(clientData),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = getMessageFromErrorBody(result, 'Failed to create client');
    throw new Error(message);
  }
  return result as Client;
};

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClient,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to create client"),
        variant: "destructive",
      });
    },
  });
}
