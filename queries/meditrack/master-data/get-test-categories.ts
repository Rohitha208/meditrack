import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import type { TestCategoryOption } from "./types";

const getTestCategories = async (): Promise<TestCategoryOption[]> => {
  const response = await fetch("/api/meditrack/lab-test/categories");
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch test categories"));
  }
  return Array.isArray(result) ? (result as TestCategoryOption[]) : [];
};

export const useGetTestCategories = (enabled = true) =>
  useQuery({
    queryKey: ["meditrack-lab-test-categories"],
    queryFn: getTestCategories,
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  });
