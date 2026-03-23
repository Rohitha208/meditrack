"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, PawPrint, Heart, Calendar, LogOut, MapPin, Syringe, Video } from "lucide-react";
import { useContext, useMemo } from "react";
import { PatientDashboardContext } from "./PatientDashboardProvider";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { href: "/patientdashboard/overview", label: "Overview", icon: CalendarDays },
  { href: "/patientdashboard/appointments", label: "Appointments", icon: Calendar },
  { href: "/patientdashboard/mypets", label: "My Pets", icon: PawPrint },
  { href: "/patientdashboard/records", label: "Medical Records", icon: Heart },
  { href: "/patientdashboard/vaccination", label: "Vaccination", icon: Syringe },
  { href: "/patientdashboard/findclinic", label: "Find Clinic", icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { handleLogout, clientData } = useContext(PatientDashboardContext);

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (clientData?.isPremium) {
      items.push({ href: "/patientdashboard/emergency", label: "Emergency", icon: Video });
    }
    return items;
  }, [clientData?.isPremium]);

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-[#D2EFEC]/30 dark:from-slate-900 dark:to-[#1E3D3D]/20 border-r border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 shadow-sm">
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-center bg-white dark:bg-slate-900 border-b border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 py-2">
        <img src="/images/logoPawTrack.png" alt="PawTrack Logo" className="h-full w-fit" />
      </div>
      {/* Navigation */}
      <nav className="flex-1 py-8 px-2">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            const isEmergency = href === "/patientdashboard/emergency";
            return (
              <li key={href}>
                {isEmergency && (
                  <div className="my-3 mx-3 border-t border-[#1E3D3D]/15 dark:border-[#1E3D3D]/20" />
                )}
                <Link href={href} legacyBehavior>
                  <a
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-lg font-medium transition-all duration-200
                      ${isActive
                        ? "bg-[#D2EFEC]/50 dark:bg-[#1E3D3D]/30 text-[#1E3D3D] dark:text-[#D2EFEC] border-l-4 border-[#1E3D3D] dark:border-[#D2EFEC] shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-[#D2EFEC]/30 dark:hover:bg-[#1E3D3D]/20 hover:text-[#1E3D3D] dark:hover:text-[#D2EFEC] hover:border-l-4 hover:border-[#1E3D3D]/50 dark:hover:border-[#D2EFEC]/50"}
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-[#1E3D3D] dark:text-[#D2EFEC]" : "text-[#1E3D3D]/60 dark:text-[#D2EFEC]/60"}`} />
                    <span className="truncate text-base">{label}</span>
                    {isEmergency && (
                      <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#D2EFEC] dark:bg-[#1E3D3D]/40 text-[#1E3D3D] dark:text-[#D2EFEC]">
                        Premium
                      </span>
                    )}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Footer with Logout for Mobile */}
      <div className="mt-auto py-5 px-6 border-t border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 bg-white dark:bg-slate-900">
        {/* Mobile Logout Button */}
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full bg-white dark:bg-slate-800 text-[#1E3D3D] dark:text-[#D2EFEC] border-[#1E3D3D]/30 dark:border-[#1E3D3D]/30 hover:bg-[#1E3D3D] hover:text-white dark:hover:bg-[#D2EFEC] dark:hover:text-[#1E3D3D] rounded-lg py-2.5 transition-all duration-200"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          &copy; {new Date().getFullYear()} PawTrack<br />All rights reserved.
        </div>
      </div>
    </aside>
  );
}
