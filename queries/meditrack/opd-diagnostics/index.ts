import { useMutation, useQuery } from "@tanstack/react-query";
import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";
import { isGuid } from "./types";
import type {
  AmendDiagnosticResultRequest,
  CollectSampleRequest,
  CreateDiagnosticOrderRequest,
  CreateDiagnosticResultRequest,
  DiagnosticCatalogueItem,
  DiagnosticOrder,
  DiagnosticVisitView,
  DiagnosticWorklist,
  DiagnosticWorklistParams,
} from "./types";

export * from "./types";

const BASE = "/api/meditrack/opd/diagnostics";

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, fallback));
  }
  return result as T;
}

export interface CatalogueParams {
  visitId?: string;
  search?: string;
  modality?: string;
  clinicId?: string;
  limit?: number;
}

const fetchCatalogue = async (params: CatalogueParams): Promise<DiagnosticCatalogueItem[]> => {
  const search = new URLSearchParams();
  if (params.visitId && isGuid(params.visitId)) search.set("visitId", params.visitId);
  if (params.search) search.set("search", params.search);
  if (params.modality) search.set("modality", params.modality);
  if (params.clinicId) search.set("clinicId", params.clinicId);
  if (params.limit) search.set("limit", String(params.limit));

  const response = await fetch(`${BASE}/catalogue?${search}`);
  return readJson<DiagnosticCatalogueItem[]>(response, "Failed to load test catalogue");
};

export const diagnosticCatalogueKey = (params: CatalogueParams) => ["meditrack", "opd-dx-catalogue", params];

export const useDiagnosticCatalogue = (params: CatalogueParams, enabled = true) =>
  useQuery({
    queryKey: diagnosticCatalogueKey(params),
    queryFn: () => fetchCatalogue(params),
    enabled,
    retry: false,
  });

const createOrder = async (body: CreateDiagnosticOrderRequest): Promise<DiagnosticVisitView> => {
  const response = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<DiagnosticVisitView>(response, "Failed to place diagnostic order");
};

export const useCreateDiagnosticOrder = () => useMutation({ mutationFn: createOrder, retry: false });

const fetchWorklist = async (params: DiagnosticWorklistParams): Promise<DiagnosticWorklist> => {
  const search = new URLSearchParams();
  if (params.modality) search.set("modality", params.modality);
  if (params.clinicId) search.set("clinicId", params.clinicId);
  if (params.date) search.set("date", params.date);
  if (params.includeDone != null) search.set("includeDone", String(params.includeDone));
  if (params.stage) search.set("stage", params.stage);
  if (params.overdueAfterMinutes != null) search.set("overdueAfterMinutes", String(params.overdueAfterMinutes));

  const response = await fetch(`${BASE}/worklist?${search}`);
  const data = await readJson<DiagnosticWorklist & { Items?: DiagnosticWorklist["items"] }>(
    response,
    "Failed to load diagnostics worklist"
  );
  const items = Array.isArray(data.items) ? data.items : Array.isArray(data.Items) ? data.Items : [];
  return {
    awaitingCount: data.awaitingCount ?? 0,
    upstreamCount: data.upstreamCount ?? 0,
    items,
  };
};

export const diagnosticWorklistKey = (params: DiagnosticWorklistParams) => ["meditrack", "opd-dx-worklist", params];

export const useDiagnosticWorklist = (params: DiagnosticWorklistParams, enabled = true) =>
  useQuery({
    queryKey: diagnosticWorklistKey(params),
    queryFn: () => fetchWorklist(params),
    enabled,
    retry: false,
    refetchInterval: 30_000,
  });

const fetchVisitView = async (visitId: string): Promise<DiagnosticVisitView> => {
  const response = await fetch(`${BASE}/visit/${visitId}`);
  const data = await readJson<DiagnosticVisitView>(response, "Failed to load visit diagnostics");
  return {
    ...data,
    orders: data.orders ?? [],
    criticalAlerts: data.criticalAlerts ?? [],
  };
};

export const diagnosticVisitKey = (visitId: string) => ["meditrack", "opd-dx-visit", visitId];

export const useDiagnosticVisit = (visitId?: string | null, enabled = true) =>
  useQuery({
    queryKey: diagnosticVisitKey(visitId || ""),
    queryFn: () => fetchVisitView(visitId as string),
    enabled: enabled && isGuid(visitId),
    retry: false,
  });

const updateOrder = async ({
  orderId,
  orderNote,
}: {
  orderId: string;
  orderNote?: string | null;
}): Promise<DiagnosticOrder> => {
  const response = await fetch(`${BASE}/orders/${orderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNote }),
  });
  return readJson<DiagnosticOrder>(response, "Failed to update order");
};

export const useUpdateDiagnosticOrder = () => useMutation({ mutationFn: updateOrder, retry: false });

const voidOrder = async ({ orderId, reason }: { orderId: string; reason: string }): Promise<DiagnosticOrder> => {
  const response = await fetch(`${BASE}/orders/${orderId}/void`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return readJson<DiagnosticOrder>(response, "Failed to void order");
};

export const useVoidDiagnosticOrder = () => useMutation({ mutationFn: voidOrder, retry: false });

const collectSample = async ({
  orderId,
  ...body
}: CollectSampleRequest & { orderId: string }): Promise<DiagnosticOrder> => {
  const response = await fetch(`${BASE}/orders/${orderId}/collect-sample`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<DiagnosticOrder>(response, "Failed to mark collected");
};

export const useCollectDiagnosticSample = () => useMutation({ mutationFn: collectSample, retry: false });

const rejectSpecimen = async ({
  orderId,
  reason,
}: {
  orderId: string;
  reason: string;
}): Promise<DiagnosticOrder> => {
  const response = await fetch(`${BASE}/orders/${orderId}/reject-specimen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  return readJson<DiagnosticOrder>(response, "Failed to reject specimen");
};

export const useRejectDiagnosticSpecimen = () => useMutation({ mutationFn: rejectSpecimen, retry: false });

const addResult = async ({
  orderId,
  ...body
}: CreateDiagnosticResultRequest & { orderId: string }): Promise<DiagnosticOrder> => {
  const response = await fetch(`${BASE}/orders/${orderId}/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<DiagnosticOrder>(response, "Failed to submit result");
};

export const useAddDiagnosticResult = () => useMutation({ mutationFn: addResult, retry: false });

const amendResult = async ({
  resultId,
  ...body
}: AmendDiagnosticResultRequest & { resultId: string }): Promise<DiagnosticOrder> => {
  const response = await fetch(`${BASE}/results/${resultId}/amend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return readJson<DiagnosticOrder>(response, "Failed to amend result");
};

export const useAmendDiagnosticResult = () => useMutation({ mutationFn: amendResult, retry: false });

const reviewResult = async (resultId: string): Promise<DiagnosticOrder> => {
  const response = await fetch(`${BASE}/results/${resultId}/review`, { method: "POST" });
  return readJson<DiagnosticOrder>(response, "Failed to review result");
};

export const useReviewDiagnosticResult = () => useMutation({ mutationFn: reviewResult, retry: false });
