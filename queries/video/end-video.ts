import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EndVideoMutationConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

type EndVideoFormData = {
  videoSessionId: string;
}

export const endVideo = async (data: EndVideoFormData) => {
  const response = await fetch('/api/video/end', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dto: data
    }),
  });

  if (!response.ok) {
    let message = 'Failed to end video call';
    try {
      const errorData = await response.json();
      message = errorData?.message || errorData?.error || message;
    } catch {
      // Ignore JSON parse errors and use fallback message
    }

    const error: any = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
};

export const useEndVideoMutation = (config?: EndVideoMutationConfig) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: endVideo,
    retry: false,
    onSuccess: (data: any) => {
      // Invalidate any video-related queries if needed
      queryClient.invalidateQueries({ queryKey: ['video'] });
      
      if (config?.onSuccess) {
        config.onSuccess(data);
      }
    },
    onError: (error: any) => {
      if (config?.onError) {
        config.onError(error);
      }
    }
  });
};
