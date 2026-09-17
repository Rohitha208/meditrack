import { useMutation } from "@tanstack/react-query";
import type { PrescriptionView } from "./types";
import { PRESCRIPTION_BASE, asView, readJson } from "./client";

const sendPrescription = async (visitId: string): Promise<PrescriptionView> => {
  const response = await fetch(`${PRESCRIPTION_BASE}/visit/${visitId}/send`, { method: "POST" });
  const data = await readJson<PrescriptionView>(response, "Failed to send prescription");
  return asView(data);
};

export const useSendPrescriptionToPharmacy = () =>
  useMutation({ mutationFn: sendPrescription, retry: false });
