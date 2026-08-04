'use client'
import withAuth from "@/utils/privateRouter";
 
import { Header } from "./header";
import { Sidebar } from "./sidebar/sidebar";
import AuthProvider from "@/provider/AuthProvider";
import { NotificationPanel } from "@/components/pawtrack/notification-bell/NotificationPanel"; 
import { SidebarProvider } from "@/components/ui/sidebar";

function MainLayout({ children }: { children: React.ReactNode }) {

    return (
        <div className="h-full w-full overflow-hidden">
            <AuthProvider>
                <SidebarProvider>
                    <Sidebar /> 
                    <div className="flex-1 md:overflow-hidden">
                        <Header />
                        <main className="overflow-y-auto p-4 max-h-[calc(100vh-3rem)] h-full">
                            {children}
                        </main>
                    </div>
                    <NotificationPanel /> {/* Add this here - it will render as a Sheet/overlay */}
                </SidebarProvider>
            </AuthProvider>
        </div>
    )
}

export default withAuth(MainLayout);