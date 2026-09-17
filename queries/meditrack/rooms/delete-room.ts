import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

const deleteRoom = async (id: string) => {
  const response = await fetch(`/api/room/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    const result = await response.json().catch(() => ({}));
    throw new Error(getMessageFromErrorBody(result, "Failed to delete room"));
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRoom,
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meditrack", "rooms"] });
    },
  });
};
