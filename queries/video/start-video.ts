import { useMutation, useQueryClient } from '@tanstack/react-query';

interface StartVideoMutationConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

type StartVideoFormData = {
  userId: string;
}

export const startVideo = async (data: StartVideoFormData) => {
  const response = await fetch('/api/video/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = 'Failed to start video call';
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

export const useStartVideoMutation = (config?: StartVideoMutationConfig) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: startVideo,
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
