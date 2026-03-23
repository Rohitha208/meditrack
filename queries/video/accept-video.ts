import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AcceptVideoMutationConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

type AcceptVideoFormData = {
  videoSessionId: string;
}

export const acceptVideo = async (data: AcceptVideoFormData) => {
  const response = await fetch('/api/video/accept', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let message = 'Failed to accept video call';
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

export const useAcceptVideoMutation = (config?: AcceptVideoMutationConfig) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: acceptVideo,
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
