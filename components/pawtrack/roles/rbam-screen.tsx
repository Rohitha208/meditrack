"use client"

import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Using native table for precise sticky headers/columns and both-axis scrolling
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useGetRole } from "@/queries/roles/get-role";
import { useGetScreen } from "@/queries/screen/get-screen";
import { useCreateScreen } from "@/queries/screen/create-screen";
import { useGetScreenAccess } from "@/queries/screen/access/get-screen-access";
import { useUpdateScreenAccess } from "@/queries/screen/access/update-screen-access";
import { toast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { useGetClinic } from "@/queries/clinic/get-clinic";
import { useRootContext } from "@/context/RootContext";
import { useQueryStates, parseAsString } from "nuqs";
import { navGroups } from "@/components/pawtrack/layout/sidebar/constant";

type AccessKey = string; // `${roleId}:${screenId}`

export default function RBACScreen() {
  const { clinic: ctxClinic, user, userType } = useRootContext();
  const companyIdFromContext = ctxClinic?.companyId ?? (user as any)?.companyId ?? null;
  const [qp, setQp] = useQueryStates({
    clinicId: parseAsString
  });
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [newScreenName, setNewScreenName] = React.useState("");
  const [newScreenDescription, setNewScreenDescription] = React.useState("");

  // Clinics for selection (filtered by companyId from user profile/root context)
  const { data: clinicsData } = useGetClinic(
    1, 
    100, 
    companyIdFromContext, 
    !!companyIdFromContext,
    userType?.isVeterinarian ? user?.id : null
  );
  const clinics = clinicsData?.items ?? [];
  
  // Sync URL clinicId -> context when available; otherwise reflect context into URL
  useEffect(() => {
    if (!clinics || clinics.length === 0) return;
    
    // If URL has clinicId and differs from context, update context from URL
    if (qp.clinicId && qp.clinicId !== ctxClinic?.id) {
      const selected = clinics.find(c => String(c.id) === qp.clinicId);
      if (selected) {
        ctxClinic?.setClinic?.({ 
          id: String(selected.id), 
          name: selected.name, 
          companyId: selected.companyId ?? ctxClinic?.companyId ?? null 
        });
      }
      return;
    }
    
    // If URL is missing clinicId but context has one, update URL
    if (!qp.clinicId && ctxClinic?.id) {
      setQp({ clinicId: ctxClinic.id });
      return;
    }
    
    // If neither has a clinic ID, set default
    if (!qp.clinicId && !ctxClinic?.id && clinics[0]?.id) {
      const defaultClinic = clinics[0];
      setQp({ clinicId: String(defaultClinic.id) });
      ctxClinic?.setClinic?.({ 
        id: String(defaultClinic.id), 
        name: defaultClinic.name, 
        companyId: defaultClinic.companyId ?? null 
      });
    }
  }, [qp.clinicId, ctxClinic, clinics, userType?.isVeterinarian, setQp]);
  
  // Handle clinic change
  const handleClinicChange = (clinicId: string) => {
    const selected = clinics.find(c => String(c.id) === clinicId);
    if (selected) {
      setQp({ clinicId });
    }
  };

  // Roles and screens
  const { data: rolesData } = useGetRole(1, 10, "", true);
  const roles = rolesData?.data ?? [];
  const visibleRoles = React.useMemo(
    () => {
      // Filter out Super Admin and Administrator, then deduplicate by role name
      const filtered = roles.filter((r: any) => !/^(Super Admin|Administrator)$/i.test(String(r?.name ?? "")));
      const seen = new Set<string>();
      return filtered.filter((r: any) => {
        const name = String(r?.name ?? "");
        if (seen.has(name)) return false;
        seen.add(name);
        return true;
      });
    },
    [roles]
  );

  const { data: screensData } = useGetScreen(1, 10, "", true);
  const screens = screensData?.data ?? [];

  // Get allowed screens for a specific role from navGroups
  const getAllowedScreensForCurrentRole = React.useCallback((roleName: string) => {
    const allowedScreens: string[] = [];
    
    navGroups.forEach(group => {
      if (group.items) {
        group.items.forEach((item) => {
          if (item.allowedRoles && item.allowedRoles.includes(roleName)) {
            allowedScreens.push(item.label);
          }
        });
      }
    });
    
    return allowedScreens;
  }, []);

  // Access matrix
  const { data: accessData, refetch: refetchAccess } = useGetScreenAccess(
    ctxClinic?.id,
    undefined,
    !!ctxClinic?.id,
    false // do NOT skip for admins in RBAC UI
  );

  // Use a Set for quick access checks
  const [grantedSet, setGrantedSet] = React.useState<Set<AccessKey>>(new Set());

  React.useEffect(() => {
    const next = new Set<AccessKey>();
    if (Array.isArray(accessData)) {
      for (const item of accessData) {
        if (item.isAccessEnable) {
          next.add(`${item.roleId}:${item.screenId}`);
        }
      }
    }
    setGrantedSet(next);
  }, [accessData]);

  const updateAccess = useUpdateScreenAccess({
    onSuccess: () => {
      refetchAccess();
    },
    onError: (error) => {
      toast({
        title: "Failed",
        description: getToastErrorMessage(error, "Could not update access"),
        variant: "destructive",
      });
    },
  });

  const createScreen = useCreateScreen({
    onSuccess: () => {
      setIsAddOpen(false);
      setNewScreenName("");
      setNewScreenDescription("");
      toast({ title: "Screen created", variant: "success" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to create screen"),
        variant: "destructive",
      });
    },
  });

  const handleToggle = (roleId: string, screenId: string, enable: boolean, roleName: string) => {
    if (!ctxClinic?.id) {
      toast({ title: "Select clinic", description: "Please select a clinic first", variant: "destructive" });
      return;
    }
    
    const key: AccessKey = `${roleId}:${screenId}`;
    // Optimistic update
    setGrantedSet((prev) => {
      const next = new Set(prev);
      if (enable) next.add(key); else next.delete(key);
      return next;
    });
    updateAccess.mutate({
      clinicId: ctxClinic.id,
      roleId,
      screenIds: [screenId],
      isAccessEnable: enable,
    });
  };

  const canSubmitNew = newScreenName.trim().length > 0;

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">RBAC — Role Based Access Control</CardTitle>
          <div className="text-xs text-muted-foreground m-0">Manage which roles can access which screens, per clinic.</div>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Clinic</Label>
            <Select
              value={ctxClinic?.id || ""}
              onValueChange={handleClinicChange}
              disabled={clinics.length === 0}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select clinic" />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((clinic) => (
                  <SelectItem key={clinic.id} value={String(clinic.id)}>
                    {clinic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                {/* <Button variant="default" className="gap-2">
                  <Plus className="h-4 w-4" /> Add Screen
                </Button> */}
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Screen</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label htmlFor="screen-name">Name</Label>
                    <Input id="screen-name" value={newScreenName} onChange={(e) => setNewScreenName(e.target.value)} placeholder="e.g. Inventory" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="screen-desc">Description</Label>
                    <Input id="screen-desc" value={newScreenDescription} onChange={(e) => setNewScreenDescription(e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createScreen.mutate({ name: newScreenName.trim(), description: newScreenDescription.trim() })}
                    disabled={!canSubmitNew || createScreen.isPending}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>


          <div className="relative border rounded-md overflow-hidden">
            <div className="overflow-auto max-h-[70vh] [scrollbar-width:thin]">
              <div className="w-[1120px] max-w-full">
              <table className="w-max border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th
                      className="sticky left-0 top-0 z-[15] bg-card p-4 text-left font-bold text-md w-[150px] min-w-[150px] border border-border border-r-[1px] border-b-2 shadow-[3px_2px_5px_-1px_rgba(0,0,0,0.15)] whitespace-nowrap"
                    >
                      Role / Screen
                    </th>
                    {screens.map((screen: any) => (
                      <th
                        key={screen.id}
                        className="sticky font-bold text-lg top-0 z-[10] bg-card p-3 text-center whitespace-nowrap w-[120px] min-w-[120px] border border-border border-b-2 text-foreground shadow-[0_2px_3px_rgba(0,0,0,0.1)]"
                      >
                        {screen.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRoles.map((role: any) => {
                    const allowedScreens = getAllowedScreensForCurrentRole(role.name);
                    return (
                    <tr key={role.id} className="group">
                      <td
                         className="sticky left-0 z-[5] bg-card p-4 font-bold text-md border border-border border-r-[1px] shadow-[3px_0_5px_-2px_rgba(0,0,0,0.15)] whitespace-nowrap w-[220px] min-w-[220px] group-hover:bg-white"
                      >
                        {role.name}
                      </td>
                      {screens.map((screen: any) => {
                        // Only filter screens for Receptionist role, show all for other roles
                        if (role.name === "Receptionist") {
                          // Case-insensitive comparison
                          const isAllowed = allowedScreens.some(s => s.toLowerCase() === screen.name.toLowerCase());
                          if (!isAllowed) {
                            return <td key={screen.id} className="p-2 border border-border group-hover:bg-muted/30 w-[130px] min-w-[130px] text-center align-middle" />;
                          }
                        }

                        const key: AccessKey = `${role.id}:${screen.id}`;
                        const checked = grantedSet.has(key);
                        return (
                          <td key={screen.id} className="p-2 border border-border group-hover:bg-muted/30 w-[130px] min-w-[130px] text-center align-middle">
                            <Switch
                              checked={checked}
                              onCheckedChange={(v) => handleToggle(role.id, screen.id, Boolean(v), role.name)}
                              aria-label={`Toggle ${role.name} access to ${screen.name}`}
                              className="data-[state=checked]:bg-[#1E3D3D]"
                            />
                          </td>
                        );
                      })}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>

    </div>
  );
}


