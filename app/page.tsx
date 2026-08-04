import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PawTrackLandingPage } from "@/components/pawtrack/landing/landing-page";

export default async function RootPage() {
  const headersList = await headers();
  const subdomain = headersList.get("x-subdomain");

  if (subdomain === "meditrack") {
    redirect("/login");
  }

  return <PawTrackLandingPage />;
}
