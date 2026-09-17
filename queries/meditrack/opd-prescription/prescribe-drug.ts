import { useMutation } from "@tanstack/react-query";
import type { PrescribeDrugRequest, PrescriptionView } from "./types";
import { PRESCRIPTION_BASE, asView, readJson } from "./client";

const prescribeDrug = async (body: PrescribeDrugRequest): Promise<PrescriptionView> => {
  const response = await fetch(`${PRESCRIPTION_BASE}/prescribe-drug`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await readJson<PrescriptionView>(response, "Failed to add drug");
  return asView(data);
};

export const usePrescribeDrug = () => useMutation({ mutationFn: prescribeDrug, retry: false });
