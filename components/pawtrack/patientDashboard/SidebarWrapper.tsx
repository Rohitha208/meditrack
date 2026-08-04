"use client"
import { useContext } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PatientDashboardContext } from "./PatientDashboardProvider";
import Sidebar from "./Sidebar";

export function SidebarWrapper() {
  const { isSidebarOpen, setIsSidebarOpen } = useContext(PatientDashboardContext);

  return (
    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <SheetContent side="left" className="w-64 p-0">
        <Sidebar />
      </SheetContent>
    </Sheet>
  );
} 