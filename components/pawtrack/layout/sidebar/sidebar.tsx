"use client"

import { usePathname, useRouter } from "next/navigation"
import {
    Menu,
    LogOut,
    ChevronDown,
    PawPrint
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { SidebarGroup, SidebarGroupLabel, useSidebar } from "@/components/ui/sidebar"
import { NavItem } from "../nav-item"
import { useRootContext } from "@/context/RootContext"
import { navGroups, isPathActive } from "./constant"
import { useCheckPermission } from "./useCheckPermission"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { ClinicSelector } from "../clinic-selector"
import { useGetScreenAccess } from "@/queries/screen/access/get-screen-access"
import { getClinicId, getCompanyId } from "@/utils/clientCookie"
import { getCompanySubdomain } from "@/utils/subdomain"
import { useGetCompanyBySubdomain, useGetCompanyById } from "@/queries/companies"
import { CompanyLogo } from "@/components/pawtrack/company-logo"

export function Sidebar() {
    const router = useRouter()
    const { state, isMobile, openMobile, setOpenMobile } = useSidebar()
    const { handleLogout, IsAdmin, user, userType } = useRootContext()
    const { checkPermission } = useCheckPermission(user)
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
        "Core Operations": true,
        "Products & Services": true,
        "Analytics": true,
        "Administration": true,
        "Settings": true,
    })
    const subdomain = getCompanySubdomain()
    const companyId = (user as any)?.companyId || getCompanyId()
    
    // Use user's companyId if available, otherwise fall back to subdomain
    const { data: company, isLoading: companyLoading, error: companyError } = useGetCompanyById(companyId || '')

    const successMessage = () => {
        toast({
            title: "Logout Successful",
            description: "You have been logged out successfully",
            variant: "success",
        })
    }
    const companyData = company || {
        name: companyLoading ? "Loading..." : "Veterinary Clinic",
        description: "Professional veterinary care for your beloved pets",
        logoUrl: "/images/logo.png",
        email: "info@pawtrack.com",
        phone: "(555) 123-4567",
        address: {
          street: "123 Pet Care Ave",
          city: "Pet City",
          state: "PC",
          postalCode: "12345",
          country: "USA"
        }
      }

    const pathname = usePathname()

    // Determine company and role for screen access
    const clinicId: string | null = (user as any)?.clinicId || getClinicId() || null
    const roleId: string | undefined = (user as any)?.roleId || undefined

    // Fetch screen access; if roleId is missing, we'll filter by role name client-side
    const { data: screenAccessData } = useGetScreenAccess(clinicId, roleId, !!clinicId && !userType?.isSuperAdmin)

    // Build a set of allowed screen labels for current role
    const allowedScreenLabels = new Set<string>(
        Array.isArray(screenAccessData)
            ? screenAccessData
                .filter((item: any) => {
                    if (!item?.isAccessEnable) return false
                    if (roleId) return true
                    // match on role name when roleId unavailable
                    return (item?.roleName || "").toLowerCase() === (user?.roleName || "").toLowerCase()
                })
                .map((item: any) => String(item?.screenName || "").toLowerCase())
            : []
    )

    const toggleGroup = (groupTitle: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupTitle]: !prev[groupTitle]
        }))
    }

    // Single group for all nav items
    const renderNavItems = () => (
        <nav className="space-y-1 px-3">
            {navGroups.map((group) => {
                // Check if group has permission
                if (!checkPermission(group.allowedRoles)) return null;

                // Filter visible items first to check if group should be shown
                const visibleItems = group.items.filter((item) => {
                    if (!checkPermission(item.allowedRoles)) return false;

                    // Dynamic label for Users -> Admins for superadmin
                    const dynamicLabel = item.href === "/users" && userType?.isSuperAdmin
                        ? "Admins"
                        : item.label;

                    // Screen access control: Super Admin bypasses; otherwise must be allowed by access list if we have one
                    const normalizedLabel = String(dynamicLabel).toLowerCase();
                    const isSuperAdmin = !!userType?.isSuperAdmin || (user?.roleName === 'Super Admin');
                    const accessAllowed = isSuperAdmin || allowedScreenLabels.size === 0 || allowedScreenLabels.has(normalizedLabel);
                    
                    return accessAllowed;
                });

                // Don't render group if no visible items
                if (visibleItems.length === 0) return null;

                return (
                    <SidebarGroup key={group.title}>
                        <Collapsible
                            open={expandedGroups[group.title]}
                            onOpenChange={() => toggleGroup(group.title)}
                        >
                            <SidebarGroupLabel>
                                <CollapsibleTrigger className={cn(
                                    "flex w-full items-center justify-between font-medium rounded-md transition-colors",
                                    state === "collapsed" && "justify-center"
                                )}>
                                    <div className={cn(
                                        "flex items-center gap-2 text-xs uppercase text-black/70 no-word-break",
                                        state === "collapsed" && "justify-center"
                                    )}>
                                        {/* <group.icon className="h-6 w-6 min-h-[1.25rem] min-w-[1.25rem]" /> */}
                                        {state !== "collapsed" && <span>{group.title}</span>}
                                    </div>
                                    {state !== "collapsed" && (
                                        <ChevronDown
                                            className={`h-5 w-5 text-black/70 min-h-[1.25rem] min-w-[1.25rem] transition-transform duration-200 ${expandedGroups[group.title] ? "rotate-180" : ""
                                                }`}
                                        />
                                    )}
                                </CollapsibleTrigger>
                            </SidebarGroupLabel>
                            <CollapsibleContent>
                                <div className={cn(
                                    "mt-2 space-y-1",
                                    state === "collapsed" ? "pl-0" : ""
                                )}>
                                    {group.items.map((item) => {
                                        if (!checkPermission(item.allowedRoles)) return null;

                                        // Use activePaths if present, otherwise default to href
                                        const isActive = isPathActive(pathname, item);

                                        // Dynamic label for Users -> Admins for superadmin
                                        const dynamicLabel = item.href === "/users" && userType?.isSuperAdmin
                                            ? "Admins"
                                            : item.label;

                                        // Screen access control: Super Admin bypasses; otherwise must be allowed by access list if we have one
                                        const normalizedLabel = String(dynamicLabel).toLowerCase();
                                        const isSuperAdmin = !!userType?.isSuperAdmin || (user?.roleName === 'Super Admin');
                                        const accessAllowed = isSuperAdmin || allowedScreenLabels.size === 0 || allowedScreenLabels.has(normalizedLabel);
                                        if (!accessAllowed) return null;

                                        return (
                                          <NavItem
                                            key={item.href}
                                            href={item.href}
                                            label={dynamicLabel}
                                            icon={item.icon}
                                            isActive={isActive}
                                            color={item.color}
                                          />
                                        );
                                    })}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </SidebarGroup>
                );
            })}
        </nav>
    )

    return (
        <>
            <Sheet open={openMobile} onOpenChange={setOpenMobile}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="absolute z-50 left-3 top-3 shrink-0 md:hidden bg-gradient-to-r from-[var(--theme-secondary)] to-[var(--theme-primary)] text-white">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-56 sm:max-w-none bg-gradient-to-b from-[var(--theme-secondary)] to-[var(--theme-primary)] text-white">
                    <div className="flex items-center gap-2 text-lg font-bold text-white px-4 pt-2 pb-2">
                        <PawPrint className="h-6 w-6" />
                        <span>PawTrack Admin</span>
                    </div>
                    <Separator className="my-2 bg-[#1E3D3D]/10" />
                    {/* Clinic Selector for mobile view */}
                    <ClinicSelector />
                    {renderNavItems()}
                </SheetContent>
            </Sheet>
            <aside className={cn(
                "hidden md:flex flex-col bg-[#fff] text-white h-screen shadow-xl transition-all duration-200",
                state === "collapsed" ? "w-16" : "w-56"
            )}>
                <div className="flex flex-col h-full min-h-0">
                    <div className={cn(
                        "flex items-center gap-3 px-6 py-4 h-16 flex-shrink-0",
                        state === "collapsed" && "justify-center px-2"
                    )}>
                        {/* <PawPrint className="h-7 w-7 text-[#9333ea]" /> */}
                        <div className="w-10 h-10 relative">
                          <CompanyLogo
                            logoUrl={companyData.logoUrl}
                            companyName={companyData.name}
                            context="admin-sidebar"
                            fallbackSrc="/images/logo.png"
                            fill
                            className="object-contain rounded"
                          />
                        </div>
                        {state !== "collapsed" && (
                            <span className="text-lg text-[#1E3D3D] font-bold tracking-tight">{companyData.name}</span>
                        )}
                    </div>

                    <Separator className="mb-2 bg-[#1E3D3D]/10 flex-shrink-0" />

                    {/* Clinic Selector for Veterinarian users */}
                    {state !== "collapsed" && <ClinicSelector />}

                    <div className="flex-grow overflow-hidden" style={{ height: "calc(100vh - 16rem)" }}>
                        <div className="h-full overflow-y-auto scrollbar-hide">
                            {renderNavItems()}
                        </div>
                    </div>

                    <div className="flex-shrink-0 mb-6 border-t">
                        <Separator className="my-4 bg-white/10" />
                        <div className="px-3">
                            <div className={cn(
                                "flex items-center gap-3 p-3 rounded-lg bg-[#1E3D3D]/20 hover:bg-[#1E3D3D]/10 transition-colors cursor-pointer",
                                state === "collapsed" && "justify-center"
                            )} onClick={() => router.push('/profile')}>
                                <Avatar className="h-10 w-10 ring-2 ring-[var(--theme-primary)] rounded-full flex items-center justify-center">
                                    <AvatarImage src="/placeholder-user.jpg" alt="User" className="rounded-full" />
                                    <AvatarFallback className="text-black">{user?.firstName?.charAt(0) || ''}{user?.lastName?.charAt(0) || ''}</AvatarFallback>
                                </Avatar>
                                {state !== "collapsed" && (
                                    <div className="flex-1 min-w-0">
                                        <p className="text-md font-medium truncate text-black">{user?.firstName} {user?.lastName}</p>
                                        <p className="text-sm text-[#1E3D3D]/70 truncate">{user?.email}</p>
                                    </div>
                                )}
                                {state !== "collapsed" && (
                                    <div onClick={(e) => {
                                        e.stopPropagation();
                                        handleLogout();
                                        successMessage();
                                    }}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-[#1E3D3D]/10">
                                            <LogOut className="h-4 w-4 text-black" />
                                            <span className="sr-only">Log out</span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}



