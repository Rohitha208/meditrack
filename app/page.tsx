import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PawTrackLandingPage } from "@/components/pawtrack/landing/landing-page";
import { WorkspaceNotFound } from "@/components/shared/workspace-not-found";
import { resolveWorkspace, isMediTrackWorkspace } from "@/utils/resolveWorkspace";

export default async function RootPage() {
  const headersList = await headers();
  const workspace = await resolveWorkspace(headersList);

  if (isMediTrackWorkspace(workspace)) {
    redirect("/login");
  }

  if (workspace.kind === "not-found") {
    return <WorkspaceNotFound subdomain={workspace.subdomain} />;
  }

  return <PawTrackLandingPage />;
}
