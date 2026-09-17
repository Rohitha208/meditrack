import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { PharmacyDispensingItem, PharmacyReturnRequest } from "./types";
import { PHARMACY_BASE, readJson } from "./client";

const returnPharmacyMedicine = async ({
  dispensingId,
  ...body
}: PharmacyReturnRequest & { dispensingId: string; visitId?: string | null }): Promise<PharmacyDispensingItem> => {
  const response = await fetch(`${PHARMACY_BASE}/${dispensingId}/return`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<PharmacyDispensingItem>(response, "Failed to process pharmacy return");
};

export const useReturnPharmacyMedicine = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: returnPharmacyMedicine,
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
