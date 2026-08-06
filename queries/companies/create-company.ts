import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Company } from "./get-company";

export interface CreateCompanyRequest {
  name: string;
  description: string;
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
  /** Optional logo file. Sent as multipart/form-data to `/api/company/upload`. */
  logoFile?: File | null;
}

const createCompany = async (companyData: CreateCompanyRequest): Promise<Company> => {
  const { logoFile, address, ...rest } = companyData;

  const form = new FormData();
  form.set("name", rest.name);
  form.set("description", rest.description ?? "");
  form.set("logoUrl", ""); // backend fills from file upload if provided
  form.set("registrationNumber", rest.registrationNumber);
  form.set("email", rest.email);
  form.set("phone", rest.phone);
  form.set("domainName", rest.domainName);
  form.set("address", JSON.stringify(address ?? {}));
  form.set("privacyPolicy", rest.privacyPolicy ?? "");
  form.set("termsOfUse", rest.termsOfUse ?? "");
  form.set("status", rest.status ?? "active");
  form.set("productType", rest.productType ?? "veterinary");
  if (logoFile instanceof File && logoFile.size > 0) {
    form.set("file", logoFile, logoFile.name);
  }

  const response = await fetch('/api/companies', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    try {
      const errorData = JSON.parse(errorText || "{}");
      const rawMessage = String(errorData?.message || errorData?.error || "").trim();
      if (/duplicate key value/i.test(rawMessage) || /uq_company_name/i.test(rawMessage)) {
        throw new Error("A company with this name already exists. Please use a different name.");
      }
      throw new Error(rawMessage || 'Failed to create company');
    } catch (err) {
      if (err instanceof Error && err.message !== 'Failed to create company') throw err;
      if (/duplicate key value/i.test(errorText) || /uq_company_name/i.test(errorText)) {
        throw new Error("A company with this name already exists. Please use a different name.");
      }
      throw new Error(errorText || 'Failed to create company');
    }
  }

  return response.json();
};

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompany,
    retry: false,
    onSuccess: () => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}