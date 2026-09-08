import { useMutation } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { RegistrationSearchResponse } from "./types";

const searchForRegistration = async (query: string): Promise<RegistrationSearchResponse> => {
  const params = new URLSearchParams({ query: query.trim() });
  const response = await fetch(`/api/meditrack/patients/registration-search?${params}`);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to search patients"));
  }
  return {
    matchType: (result.matchType || "none") as RegistrationSearchResponse["matchType"],
    results: Array.isArray(result.results) ? result.results : [],
  };
};

export const useRegistrationSearch = () =>
  useMutation({
    mutationFn: searchForRegistration,
    retry: false,
  });
