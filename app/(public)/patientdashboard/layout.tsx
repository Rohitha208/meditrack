import Header from "@/components/pawtrack/patientDashboard/Header";
import MobileHeader from "@/components/pawtrack/patientDashboard/MobileHeader";
import { PatientDashboardProvider } from "@/components/pawtrack/patientDashboard/PatientDashboardProvider";
import Sidebar from "@/components/pawtrack/patientDashboard/Sidebar";
import { SidebarWrapper } from "@/components/pawtrack/patientDashboard/SidebarWrapper";
import { NotificationInitializer } from "@/components/pawtrack/notification-bell/NotificationInitializer";
import { NotificationListener } from "@/components/pawtrack/notification-bell/NotificationListener";



export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <PatientDashboardProvider>
      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>
        
        {/* Mobile Sidebar Sheet */}
        <SidebarWrapper />

        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <div className="md:hidden">
            <MobileHeader />
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block">
            <Header />
          </div>

          <main className="flex-1 p-4 bg-gray-50 h-full max-h-[calc(100vh-4rem)] overflow-y-auto">{children}</main>
        </div>
      </div>
      
      {/* Notification components for real-time updates */}
      <NotificationInitializer />
      <NotificationListener />
    </PatientDashboardProvider>
  );
}
