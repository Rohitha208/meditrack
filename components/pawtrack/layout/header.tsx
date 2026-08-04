"use client"
import { BreadcrumbNav } from "@/components/pawtrack/layout/breadcrumb-nav"
import { useRootContext } from "@/context/RootContext"
 
import { NotificationBell } from "@/components/pawtrack/notification-bell/NotificationBell"
import { SidebarTrigger } from "@/components/ui/sidebar";

export function Header() {
  const { user, userType } = useRootContext();

  const showNotificationBell = userType?.isClinicAdmin || userType?.isVeterinarian || userType?.isReceptionist;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-accent px-2 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger />

        {/* breadcrumb */}
        <BreadcrumbNav />
      </div>


      <div className="flex items-center gap-4">
        {showNotificationBell && <NotificationBell />}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Welcome,</span>
          <span className="font-medium">{user?.firstName} {user?.lastName}</span>
          {user?.clinicName && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{user.clinicName}</span>
            </>
          )}
        </div>
        {/* <Popover>
          <PopoverTrigger asChild>
            <div className="relative cursor-pointer">
              <Button variant="ghost" size="icon">
                <BellRing className="h-5 w-5" />
              </Button>
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500">3</Badge>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <div className="p-3 border-b">
              <h4 className="font-medium">Notifications</h4>
              <p className="text-xs text-muted-foreground">You have 3 unread notifications</p>
            </div>
            <div className="max-h-80 overflow-auto">
              <div className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                <p className="text-sm font-medium">New order received</p>
                <p className="text-xs text-muted-foreground">Order #12345 has been placed</p>
                <p className="text-xs text-muted-foreground mt-1">5 minutes ago</p>
              </div>
              <div className="p-3 border-b hover:bg-muted/50 cursor-pointer">
                <p className="text-sm font-medium">Inventory alert</p>
                <p className="text-xs text-muted-foreground">Product ABC123 is low in stock</p>
                <p className="text-xs text-muted-foreground mt-1">1 hour ago</p>
              </div>
              <div className="p-3 hover:bg-muted/50 cursor-pointer">
                <p className="text-sm font-medium">System update</p>
                <p className="text-xs text-muted-foreground">System maintenance scheduled for tonight</p>
                <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
              </div>
            </div>
            <div className="p-2 border-t">
              <Button variant="ghost" className="w-full text-sm" size="sm">View all notifications</Button>
            </div>
          </PopoverContent>
        </Popover> */}
      </div>
    </header>
  )
}
