import { Slot } from "@/components/pawtrack/appointments/appointment-details";
import { useMutation, useQueryClient } from "@tanstack/react-query";
 

type CreateSlotData = Omit<Slot, "id">;

interface MutationOptions {
  onSuccess?: (data: Slot) => void;
  onError?: (error: Error) => void;
}

export const useCreateSlot = ({ onSuccess, onError }: MutationOptions = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation<Slot, Error, CreateSlotData>({
    mutationFn: async (data: CreateSlotData) => {
      const response = await fetch('/api/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create slot');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate related queries
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
