import { useQuery } from "@tanstack/react-query";
import { isGuid, type DrugCatalogueItem, type DrugCatalogueParams } from "./types";
import { PRESCRIPTION_BASE, asCatalogue, readJson } from "./client";

const getDrugCatalogue = async (params: DrugCatalogueParams): Promise<DrugCatalogueItem[]> => {
  const search = new URLSearchParams();
  if (params.visitId && isGuid(params.visitId)) search.set("visitId", params.visitId);
  if (params.search) search.set("search", params.search);
  if (params.clinicId) search.set("clinicId", params.clinicId);
  if (params.limit) search.set("limit", String(params.limit));

  const response = await fetch(`${PRESCRIPTION_BASE}/catalogue?${search}`);
  const data = await readJson<unknown>(response, "Failed to load Drug Master");
  return asCatalogue(data);
};

export const drugCatalogueKey = (params: DrugCatalogueParams) => ["meditrack", "opd-rx-catalogue", params];

export const useDrugCatalogue = (params: DrugCatalogueParams, enabled = true) =>
  useQuery({
    queryKey: drugCatalogueKey(params),
    queryFn: () => getDrugCatalogue(params),
    enabled,
    retry: false,
  });
