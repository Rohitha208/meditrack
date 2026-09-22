import { getMessageFromErrorBody } from "@/utils/apiErrorHandler";

export const ADMISSION_REFERRAL_BASE = "/api/meditrack/admission-referral";

export async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getMessageFromErrorBody(result, fallback));
  }
  return result as T;
}
