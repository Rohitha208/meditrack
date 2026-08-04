import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Slot } from "@/components/pawtrack/appointments/appointment-details";

type UpdateSlotInput = {
  id: string;
  data: Slot;
};

interface MutationOptions {
  onSuccess?: (data: Slot) => void;
  onError?: (error: Error) => void;
}

export const useUpdateSlot = ({ onSuccess, onError }: MutationOptions = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation<Slot, Error, UpdateSlotInput>({
    mutationFn: async ({ id, data }: UpdateSlotInput) => {
      const response = await fetch(`/api/slots/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to update slot');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['slots', 'byId', data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['slots', 'byRoomId', data.roomId],
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error);
      }
    },
  });
};
