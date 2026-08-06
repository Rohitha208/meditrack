import { headers } from "next/headers";
import { PawTrackForgotPasswordPage } from "@/components/pawtrack/auth/password-reset/ForgotPasswordPage";
import { MediTrackForgotPasswordPage } from "@/components/meditrack/auth/password-reset/forgot-password-page";
import { WorkspaceNotFound } from "@/components/shared/workspace-not-found";
import { resolveWorkspace, isMediTrackWorkspace } from "@/utils/resolveWorkspace";

export default async function ForgotPasswordPage() {
  const headersList = await headers();
  const workspace = await resolveWorkspace(headersList);

  if (isMediTrackWorkspace(workspace)) {
    return <MediTrackForgotPasswordPage />;
  }

  if (workspace.kind === "not-found") {
    return <WorkspaceNotFound subdomain={workspace.subdomain} />;
  }

  return <PawTrackForgotPasswordPage />;
}
