import { useMutation } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export interface UploadRegistrationCardsRequest {
  patientId: string;
  cardLabel?: string;
  cardNumber?: string;
  file: File;
}

const uploadCards = async ({
  patientId,
  cardLabel = "ABHA Card",
  cardNumber,
  file,
}: UploadRegistrationCardsRequest): Promise<void> => {
  const form = new FormData();
  form.append("patientId", patientId);
  form.append("cardLabels", cardLabel);
  if (cardNumber) form.append("cardNumbers", cardNumber);
  form.append("cardFiles", file);

  const response = await fetch("/api/meditrack/patients/register/upload", {
    method: "POST",
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to upload card"));
  }
};

export const useUploadRegistrationCards = () =>
  useMutation({
    mutationFn: uploadCards,
    retry: false,
  });
