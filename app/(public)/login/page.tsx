import { headers } from "next/headers";
import { PawTrackLoginPage } from "@/components/pawtrack/auth/login/login-page";
import { MediTrackLoginPage } from "@/components/meditrack/auth/login/login-page";

export default async function LoginPage() {
  const headersList = await headers();
  const subdomain = headersList.get("x-subdomain");

  if (subdomain === "meditrack") {
    return <MediTrackLoginPage />;
  }

  return <PawTrackLoginPage />;
}
