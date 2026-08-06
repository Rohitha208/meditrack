import { headers } from "next/headers";
import { PawTrackInternalLoginPage } from "@/components/pawtrack/auth/login/internal-login-page";
import { MediTrackLoginPage } from "@/components/meditrack/auth/login/login-page";
import { WorkspaceNotFound } from "@/components/shared/workspace-not-found";
import { resolveWorkspace, isMediTrackWorkspace } from "@/utils/resolveWorkspace";

export default async function LoginInternalPage() {
  const headersList = await headers();
  const workspace = await resolveWorkspace(headersList);

  if (isMediTrackWorkspace(workspace)) {
    return <MediTrackLoginPage />;
  }

  if (workspace.kind === "not-found") {
    return <WorkspaceNotFound subdomain={workspace.subdomain} />;
  }

  return <PawTrackInternalLoginPage />;
}
