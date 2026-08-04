import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateIntakeDetailRequest, IntakeDetail } from "@/components/pawtrack/appointments/Patient-Information/types/intake";

const createIntakeDetail = async (data: CreateIntakeDetailRequest): Promise<IntakeDetail> => {
  try {
    // Create FormData for multipart/form-data submission
    const formData = new FormData();
    
    // Add basic fields
    formData.append('visitId', data.visitId);
    formData.append('weightKg', data.weightKg.toString());
    formData.append('notes', data.notes);
    formData.append('isCompleted', data.isCompleted.toString());
    
    // Add image paths as array
    if (data.imagePaths && data.imagePaths.length > 0) {
      data.imagePaths.forEach(path => {
        formData.append('imagePaths', path);
      });
    }
    
    // Add files as array
    if (data.files && data.files.length > 0) {
      data.files.forEach(file => {
        formData.append('files', file);
      });
    }
    
    const response = await fetch('/api/IntakeDetail', {
      method: 'POST',
      body: formData, // No need to set Content-Type, browser will set it with boundary
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create intake detail');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating intake detail:', error);
    throw error;
  }
};

export const useCreateIntakeDetail = ({ 
  onSuccess, 
  onError 
}: {
  onSuccess?: (data: IntakeDetail) => void;
  onError?: (error: any) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIntakeDetail,
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['intake'] });
      queryClient.invalidateQueries({ queryKey: ['intake', data.visitId] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: any) => {
      if (onError) onError(error);
    }
  });
}; 