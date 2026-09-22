import { useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { Company } from "./get-company";

export const getCompanyBySubdomain = async (subdomain: string) => {
  if (!subdomain) throw new Error("Subdomain is required");

  const response = await fetch(
    `/api/companies/by-subdomain?subdomain=${encodeURIComponent(subdomain)}`
  );
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, "Failed to fetch company data"));
  }

  return result as Company;
};

export function useGetCompanyBySubdomain(subdomain: string) {
  return useQuery({
    queryKey: ["company", "subdomain", subdomain],
    queryFn: () => getCompanyBySubdomain(subdomain),
    enabled: !!subdomain,
    retry: false,
  });
}
