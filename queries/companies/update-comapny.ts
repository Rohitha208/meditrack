import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Company } from "./get-company";

export interface UpdateCompanyRequest {
  id: string;
  name: string;
  description: string;
  logoUrl?: string | null;
  registrationNumber: string;
  email: string;
  phone: string;
  domainName: string; // Added domain field
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: string;
  productType: string;
  privacyPolicy?: string; // Base64 encoded PDF
  termsOfUse?: string; // Base64 encoded PDF
  /** Optional logo file. When provided, uses multipart/form-data update route. */
  logoFile?: File | null;
}

const updateCompany = async (companyData: UpdateCompanyRequest): Promise<Company> => {
  const { id, logoFile, address, ...rest } = companyData;

  const trimmedLogoUrl =
    typeof rest.logoUrl === "string" ? rest.logoUrl.trim() : rest.logoUrl;
  const logoUrl = trimmedLogoUrl === "" ? "" : (trimmedLogoUrl ?? "");

  const response = logoFile instanceof File && logoFile.size > 0
    ? await (async () => {
        const form = new FormData();
        form.set("name", rest.name);
        form.set("description", rest.description ?? "");
        form.set("logoUrl", logoUrl);
        form.set("registrationNumber", rest.registrationNumber);
        form.set("email", rest.email);
        form.set("phone", rest.phone);
        form.set("domainName", rest.domainName);
        form.set("address", JSON.stringify(address ?? {}));
        form.set("privacyPolicy", rest.privacyPolicy ?? "");
        form.set("termsOfUse", rest.termsOfUse ?? "");
        form.set("status", rest.status ?? "active");
        form.set("productType", rest.productType ?? "veterinary");
        form.set("file", logoFile, logoFile.name);
        return fetch(`/api/companies/${id}`, {
          method: "PUT",
          body: form,
        });
      })()
    : await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...rest,
          logoUrl: logoUrl || undefined,
          address,
        }),
      });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    try {
      const errorData = JSON.parse(errorText || "{}");
      throw new Error(errorData?.message || errorData?.error || 'Failed to update company');
    } catch {
      throw new Error(errorText || 'Failed to update company');
    }
  }

  return response.json();
};

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCompany,
    onSuccess: (data) => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Update the specific company in cache
      queryClient.setQueryData(['company', data.id], data);
      // Invalidate company-by-subdomain so home page (and login/register) show fresh logo/data
      queryClient.invalidateQueries({ queryKey: ['company', 'subdomain'] });
    },
  });
}