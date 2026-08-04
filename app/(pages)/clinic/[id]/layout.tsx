'use client';
 
import React, { use } from "react";
import DetailsLayout from "@/components/pawtrack/clinic/details/layout";
import { usePathname } from "next/navigation";
 
function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  // Extract clinicId from the pathname instead of params
  const pathname = usePathname();
  const pathParts = pathname.split('/');
  const pathClinicId = pathParts.length > 2 ? pathParts[2] : '';
  const clinicData = {
    clinicId: pathClinicId
  };
  return (
    <DetailsLayout clinicData={clinicData}>{children}</DetailsLayout>
  );
}
export default Layout;