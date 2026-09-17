import { useMutation } from "@tanstack/react-query";
import type { PrescriptionView } from "./types";
import { PRESCRIPTION_BASE, asView, readJson } from "./client";

const deletePrescribedDrug = async ({
  visitId,
  prescribedDrugId,
}: {
  visitId: string;
  prescribedDrugId: string;
}): Promise<PrescriptionView> => {
  const response = await fetch(`${PRESCRIPTION_BASE}/visit/${visitId}/drugs/${prescribedDrugId}`, {
    method: "DELETE",
  });
  const data = await readJson<PrescriptionView>(response, "Failed to remove drug");
  return asView(data);
};

export const useRemovePrescribedDrug = () =>
  useMutation({ mutationFn: deletePrescribedDrug, retry: false });
