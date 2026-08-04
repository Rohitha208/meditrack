import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UpdateIntakeDetailRequest, IntakeDetail } from "@/components/pawtrack/appointments/Patient-Information/types/intake";

const updateIntakeDetail = async (request: UpdateIntakeDetailRequest): Promise<IntakeDetail> => {
  try {
    const { id, files, ...otherData } = request;
    
    if (!id) {
      throw new Error("Intake ID is required");
    }
    
    // Create FormData for multipart/form-data submission
    const formData = new FormData();
    
    // Add ID field
    formData.append('id', id);
    
    // Add all other basic fields
    if (otherData.visitId) formData.append('visitId', otherData.visitId);
    if (otherData.weightKg !== undefined) formData.append('weightKg', otherData.weightKg.toString());
    if (otherData.notes !== undefined) formData.append('notes', otherData.notes);
    if (otherData.isCompleted !== undefined) formData.append('isCompleted', otherData.isCompleted.toString());
    
    // Add image paths as array
    if (otherData.imagePaths && otherData.imagePaths.length > 0) {
      otherData.imagePaths.forEach(path => {
        formData.append('imagePaths', path);
      });
    }
    
    // Add files as array
    if (files && files.length > 0) {
      files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    const response = await fetch(`/api/IntakeDetail/${id}`, {
      method: 'PUT',
      // No need to set Content-Type, browser will set it with boundary
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update intake detail');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating intake detail:', error);
    throw error;
  }
};

export const useUpdateIntakeDetail = ({ 
  onSuccess, 
  onError 
}: {
  onSuccess?: (data: IntakeDetail) => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateIntakeDetail,
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['intake'] });
      queryClient.invalidateQueries({ queryKey: ['intake', 'detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['intake', data.visitId] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: any) => {
      if (onError) onError(error);
    }
  });
}; 