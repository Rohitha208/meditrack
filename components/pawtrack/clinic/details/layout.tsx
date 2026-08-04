"use client";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-new";
import { usePathname, useRouter } from "next/navigation";
import withAuth from "@/utils/privateRouter";

function DetailsLayout({
  children,
  clinicData,
}: {
  children: React.ReactNode;
  clinicData: { clinicId: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Get clinicId from props instead of params
  const { clinicId } = clinicData;
  
  const tabsList = ['rooms', 'doctors', 'users', 'appointmentType'];
  const currentTab = pathname.split("/").pop() || "rooms";

  const handleTabChange = (value: string) => {
    const url = `/clinic/${clinicId}/${value}`;
    router.push(url);
  };

  if (!tabsList.includes(currentTab)) {
    return children;
  }

  return (
    <div className="p-0 mt-2">
      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="w-full px-4"
      >
        <TabsList className="space-x-3">
          <TabsTrigger value="rooms" className="px-4 py-1 text-sm font-medium text-gray-700 hover:text-black focus:outline-none !focus:bg-black !focus:text-white">Rooms</TabsTrigger>
          <TabsTrigger value="doctors" className="px-4 py-1 text-sm font-medium text-gray-700 hover:text-black focus:outline-none !focus:bg-black !focus:text-white">Doctors</TabsTrigger>
          <TabsTrigger value="users" className="px-4 py-1 text-sm font-medium text-gray-700 hover:text-black focus:outline-none !focus:bg-black !focus:text-white">Users</TabsTrigger>
          {/* <TabsTrigger value="appointmentType" className="px-4 py-1 text-sm font-medium text-gray-700 hover:text-black focus:outline-none !focus:bg-black !focus:text-white">Appointment Type</TabsTrigger> */}
        </TabsList>
        <TabsContent value={currentTab}>{children}</TabsContent>
      </Tabs>
    </div>
  );
}

export default withAuth(DetailsLayout);
