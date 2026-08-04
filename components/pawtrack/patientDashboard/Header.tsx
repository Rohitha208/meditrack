"use client"
import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { PatientDashboardContext } from "./PatientDashboardProvider";
import { LogOut } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/pawtrack/notification-bell/NotificationBell"
import { NotificationPanel } from "@/components/pawtrack/notification-bell/NotificationPanel"

export default function Header() {
  const { clientData, handleLogout } = useContext(PatientDashboardContext);
  const onLogout = () => {
    handleLogout();
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
      variant: "success",
    })
  }

  return (
    <header className="h-16 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 shadow-sm flex items-center justify-between px-6">
      <div className="font-semibold text-lg text-[#1E3D3D] dark:text-[#D2EFEC]">
        {clientData ? `Welcome, ${clientData.firstName} ${clientData.lastName}` : "PawTrack Dashboard"}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative">
          <NotificationBell />
        </div>
        <Button 
          variant="outline" 
          onClick={onLogout}
          className="bg-white dark:bg-slate-800 text-[#1E3D3D] dark:text-[#D2EFEC] border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 hover:bg-[#1E3D3D] hover:text-white dark:hover:bg-[#D2EFEC] dark:hover:text-[#1E3D3D] rounded-full p-2 h-10 w-10 shadow-sm transition-all duration-200"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
      <NotificationPanel />
    </header>
  );
}