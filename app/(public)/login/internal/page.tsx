import { headers } from "next/headers";
import { PawTrackInternalLoginPage } from "@/components/pawtrack/auth/login/internal-login-page";
import { MediTrackLoginPage } from "@/components/meditrack/auth/login/login-page";

export default async function LoginInternalPage() {
  const headersList = await headers();
  const subdomain = headersList.get("x-subdomain");

  if (subdomain === "meditrack") {
    return <MediTrackLoginPage />;
  }

  return <PawTrackInternalLoginPage />;
}
