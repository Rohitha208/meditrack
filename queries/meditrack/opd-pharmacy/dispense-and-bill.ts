import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreatePharmacyDispenseRequest, PharmacyDispensing } from "./types";
import { PHARMACY_BASE, readJson } from "./client";
import { pharmacyVisitOrderKey } from "./get-visit-order";

const dispenseAndBill = async (body: CreatePharmacyDispenseRequest): Promise<PharmacyDispensing> => {
  const response = await fetch(PHARMACY_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<PharmacyDispensing>(response, "Failed to dispense pharmacy bill");
};

export const useDispenseAndBill = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dispenseAndBill,
    retry: false,
    onSuccess: (_data, variables) => {
      if (variables.visitId) {
        queryClient.invalidateQueries({ queryKey: pharmacyVisitOrderKey(variables.visitId) });
      }
    },
  });
};
