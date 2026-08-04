import Clinic from "@/components/pawtrack/clinic";
import { promises } from "dns";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Clinic",
};

async function Page({
  searchParams,
}  : {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { cookies } = await import("next/headers")
    return <Clinic />;
}

export default Page



