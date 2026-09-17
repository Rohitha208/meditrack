import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PharmacyCreditNote, VoidPharmacyBillRequest } from "./types";
import { PHARMACY_BASE, readJson } from "./client";

const voidPharmacyBill = async ({
  dispensingId,
  ...body
}: VoidPharmacyBillRequest & { dispensingId: string; visitId?: string | null }): Promise<PharmacyCreditNote> => {
  const response = await fetch(`${PHARMACY_BASE}/${dispensingId}/void`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<PharmacyCreditNote>(response, "Failed to void pharmacy bill");
};

export const useVoidPharmacyBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: voidPharmacyBill,
    retry: false,
    onSuccess: (_data, variables) => {
      if (variables.visitId) {
        queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-pharmacy-visit", variables.visitId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["meditrack", "opd-pharmacy-visit"] });
      }
    },
  });
};
