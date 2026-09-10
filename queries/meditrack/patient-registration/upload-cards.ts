import { useMutation } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export interface RegistrationCardInput {
  label: string;
  number?: string;
  file: File;
}

export interface UploadRegistrationCardsRequest {
  patientId: string;
  cards: RegistrationCardInput[];
}

const uploadCards = async ({ patientId, cards }: UploadRegistrationCardsRequest): Promise<void> => {
  const form = new FormData();
  form.append("patientId", patientId);
  // Backend matches labels/numbers/files by index, so append one entry per card.
  cards.forEach((card) => {
    form.append("cardLabels", card.label);
    form.append("cardNumbers", card.number || "");
    form.append("cardFiles", card.file);
  });

  const response = await fetch("/api/meditrack/patients/register/upload", {
    method: "POST",
    body: form,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to upload cards"));
  }
};

export const useUploadRegistrationCards = () =>
  useMutation({
    mutationFn: uploadCards,
    retry: false,
  });
