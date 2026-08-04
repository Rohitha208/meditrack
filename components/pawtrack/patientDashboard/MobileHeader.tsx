"use client"
import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { PatientDashboardContext } from "./PatientDashboardProvider";

export default function MobileHeader() {
  const { setIsSidebarOpen } = useContext(PatientDashboardContext);

  return (
    <header className="h-16 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 shadow-sm flex items-center px-4 gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsSidebarOpen(true)}
        className="p-2"
      >
        <Menu className="h-5 w-5 text-[#1E3D3D] dark:text-[#D2EFEC]" />
      </Button>
      <div className="font-semibold text-base text-[#1E3D3D] dark:text-[#D2EFEC] truncate">
        PawTrack Dashboard
      </div>
      <div className="w-10"></div> {/* Spacer for centering */}
    </header>
  );
} 