"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useStoreLocalStorage from "./useLocalStorage";
import { useQueryClient } from "@tanstack/react-query";
import { useGetRoleById } from "@/queries/roles/get-role-by-id";

import {
    getUserId,
    getJwtToken,
    removeUserId,
    removeJwtToken,
    removeProjectName,
    removeProjectId,
    removeClinicId,
    setUserId,
    setClinicId,
    setClinicName,
    removeClinicName,
    setCompanyId,
    getClientId,
    setProductType,
    getProductType,
    removeProductType
} from "../utils/clientCookie";
import { isTokenExpired, getTokenExpiration } from "../utils/jwtToken";
import { isHumanProductType, type ProductType } from "../utils/appMode";

export type { ProductType };

export type User = {
    id: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: string;
    roleId: string;
    roleName: string;
    clinicId: string | null;
    clinicName: string | null;
    clinic: string | null;
    isActive: boolean;
    lastLogin: string | null;
    createdAt: string;
    updatedAt: string;
    companyId?: string | null;
    productType?: ProductType | null;
    companyProductType?: ProductType | null;
}

export type UserType = {
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isClinicAdmin: boolean;
    isReceptionist: boolean;
    isPatient: boolean;
    isClient: boolean;
    isProvider: boolean;
    isVeterinarian: boolean;
}

const userRolesObject: UserType = {
    isAdmin: false,
    isSuperAdmin: false,
    isClinicAdmin: false,
    isReceptionist: false,
    isPatient: false,
    isClient: false,
    isProvider: false,
    isVeterinarian: false,
}

type workspace = {
    id: number | null;
    name: string | null;
}
export const useContentLayout = () => {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [clinic, setClinic] = useState<{ id: string | null, name: string | null, companyId?: string | null }>({
        id: null,
        name: null,
        companyId: null
    });
    const [collapsed, setCollapsed] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [productType, setProductTypeState] = useState<ProductType | null>(
        () => (getProductType() as ProductType) || null
    );
    const [roles, setRoles] = useState<string[] | null>(null);
    const [IsAdmin, setIsAdmin] = useState<boolean | null>(null);
    const [userType, setUserType] = useState<typeof userRolesObject>(userRolesObject);
    const [authorized, setAuthorized] = useState(false);
    const [, setRoleToLocal] = useStoreLocalStorage('role', '');
    const [, setUserToLocal] = useStoreLocalStorage<any>('user', '');
    const queryClient = useQueryClient();

    // Custom setClinic function to also update cookies and local storage user object
    const updateClinicAndCookies = (newClinic: { id: string | null, name: string | null, companyId?: string | null }) => {
        setClinic(newClinic);
        if (newClinic.id) {
            setClinicId(newClinic.id);
        } else {
            removeClinicId();
        }
        if (newClinic.name) {
            setClinicName(newClinic.name);
        } else {
            removeClinicName();
        }

        // Update the user object in local storage as well
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                userData.clinicId = newClinic.id;
                userData.clinicName = newClinic.name;
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData); // Update the user state as well
            }
        }
    };

    const updateProductType = (newProductType?: ProductType | string | null) => {
        if (!newProductType) return;
        const normalized = newProductType as ProductType;
        setProductTypeState(normalized);
        setProductType(normalized);
    };

    // Check token expiration periodically and on mount
    useEffect(() => {
        const checkTokenExpiration = () => {
            const token = getJwtToken();
            if (token && isTokenExpired(token)) {
                console.warn('Token expired, logging out...');
                handleLogout();
                return;
            }
        };

        // Check immediately
        checkTokenExpiration();

        // Check token expiration every minute
        const interval = setInterval(checkTokenExpiration, 60000);

        // Also check based on token expiration time
        const token = getJwtToken();
        if (token) {
            const expirationTime = getTokenExpiration(token);
            if (expirationTime) {
                const timeUntilExpiration = expirationTime - Date.now();
                if (timeUntilExpiration > 0) {
                    // Set a timeout to check right before expiration
                    const timeout = setTimeout(() => {
                        checkTokenExpiration();
                    }, Math.max(0, timeUntilExpiration - 5000)); // Check 5 seconds before expiration

                    return () => {
                        clearInterval(interval);
                        clearTimeout(timeout);
                    };
                }
            }
        }

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, pathname]); // handleLogout is stable and doesn't need to be in deps

    // Initial user fetch - only if user is not already set (e.g., from login)
    useEffect(() => {
        // Check token expiration before fetching user
        const token = getJwtToken();
        if (token && isTokenExpired(token)) {
            console.warn('Token expired on mount, logging out...');
            handleLogout();
            return;
        }

        if (!user) {
            fetchUser();
        }
    }, []);
    
    // Check for clinic ID in cookies on component mount
    
    const fetchUser = async (data?: any, role?: any) => {
        // Check token expiration before proceeding
        const token = getJwtToken();
        if (token && isTokenExpired(token)) {
            console.warn('Token expired during fetchUser, logging out...');
            handleLogout();
            return;
        }

        const productTypeFromLoginData =
            data?.productType ||
            data?.company?.productType ||
            data?.user?.productType ||
            data?.user?.companyProductType ||
            null;
        if (productTypeFromLoginData) {
            updateProductType(productTypeFromLoginData);
        }

        if (role === "Client") {
            setUser(data?.user);
            setAuthorized(true);
            setLoading(false);
            return;
        }

        // If we have login data, use it immediately to avoid blocking UI
        // Then fetch full profile in background
        if (data?.user) {
            const loginUser = data.user;
            // Set initial user data from login response to unblock UI
            setUser(loginUser);
            setAuthorized(true);
            setLoading(false); // Allow UI to render immediately

            // Extract clinic info from login data if available
            // Set company ID from login response if available
            if (loginUser.companyId) {
                setCompanyId(loginUser.companyId);
            }

            if (loginUser.clinicId || loginUser.clinicName) {
                setClinicId(loginUser.clinicId);
                setClinicName(loginUser.clinicName);
                setClinic({
                    id: loginUser.clinicId,
                    name: loginUser.clinicName,
                    companyId: loginUser.companyId || null
                });
            }
            
            // Register user with login data
            registerUser(loginUser);
        }
        
        let userid = getUserId() || data?.user?.id;
        if (!userid && data?.user?.id) {
            userid = data.user.id;
        }
        // Guard against bad cookie values like "undefined"/"null"
        if (userid === "undefined" || userid === "null") {
            userid = undefined as any;
        }
        if (!userid && (pathname !== '/login' && pathname !== '/register' && pathname !== '/login/internal' && pathname !== '/')) {
            // Check if this is a client dashboard scenario
            const clientId = getClientId();
            if (!clientId) {
                // No userid and no clientId - logout
                setLoading(false);
                handleLogout();
                return;
            }
            // Has clientId but no userid - continue (client dashboard scenario)
        }
        // Only fetch full user profile if we don't have complete data or need clinic info
        // This fetch happens in background and updates the user state when complete
        try {
            let response;
            
            // If we have a userid, use the user API, otherwise use client API
            if (userid) {
                response = await fetch(`/api/user/${userid}`);
            } else {
                // For client dashboard, use clientId to fetch client data
                const clientId = getClientId();
                if (clientId) {
                    response = await fetch(`/api/clients/${clientId}`);
                } else {
                    return;
                }
            }
            
            // Check for 401 Unauthorized response
            if (response.status === 401) {
                console.warn('Received 401 Unauthorized, token may be expired');
                handleLogout();
                return;
            }

            const userData = await response.json();

            if (!userData || userData.status === 400) {
                console.error("userData not found");
                // Don't set loading to false here if we already have login data
                if (!data?.user) {
                    setLoading(false);
                    setAuthorized(false);
                }
                return;
            }
            let effectiveClinicId = userData.clinicId || (userData as any)?.clinics?.[0]?.clinicId || (userData as any)?.clinics?.[0]?.id;
            let effectiveClinicName = userData.clinicName || (userData as any)?.clinics?.[0]?.clinicName || (userData as any)?.clinics?.[0]?.name;
            let effectiveCompanyId = (userData as any)?.companyId ?? (userData as any)?.clinicCompanyId ?? null;
            let effectiveProductType = (userData as any)?.productType ?? (userData as any)?.companyProductType ?? null;

            // Set company ID in cookies if available
            if (effectiveCompanyId) {
                setCompanyId(effectiveCompanyId);
            }

            if (effectiveProductType) {
                updateProductType(effectiveProductType);
            }

            // Update user with complete data only if this is actual user data (not client data)
            if (userid) {
                setUser({ ...userData, clinicId: effectiveClinicId, clinicName: effectiveClinicName });
                setUserId(userData.id);
                registerUser(userData);
            } else {
                // This is client data, but we still need to set the user type for notifications
                console.log("Client data loaded, setting user type for client");
                // For clients, we need to manually set the user type since we don't call registerUser
                setUserType((prev) => ({ ...userRolesObject, isClient: true }));
            }
            
            // Always set clinic info and authorization regardless of user/client type
            setClinicId(effectiveClinicId);
            setClinicName(effectiveClinicName);
            setClinic({
                id: effectiveClinicId,
                name: effectiveClinicName,
                companyId: effectiveCompanyId
            });
            setAuthorized(true);
        } catch (error) {
            console.error("Error fetching user:", error);
            // Only set loading/authorized to false if we don't have login data
            if (!data?.user) {
                setAuthorized(false);
                setLoading(false);
            }
        }
    };

    const registerUser = (userData: User) => {
        // setWorkspace(prev => ({
        //     ...prev,
        //     id: userData.workspaceId,
        //     name: userData.workspaceName
        // }))
        if (userData) {
            const types = {
                isAdmin: userData.roleName === 'Administrator',
                isSuperAdmin: userData.roleName === 'Super Admin',
                isClinicAdmin: userData.roleName === 'Clinic Admin',
                isReceptionist: userData.roleName === 'Receptionist',
                isPatient: userData.roleName === 'Patient',
                isClient: userData.roleName === 'Client',
                isVeterinarian: userData.roleName === 'Veterinarian',
                isProvider: (userData.roleName === ' ' || userData?.roleName?.toLocaleLowerCase().includes('veterinarian')),
            }
            setUserType((prev) => ({ ...userRolesObject, ...types }));
        }
        setIsAdmin(userData.roleName === 'Administrator' || userData.roleName === 'Super Admin');
        setRoles([userData.roleName]);
        setRoleToLocal(userData.roleName);
        setUserToLocal(JSON.stringify(userData));
        setLoading(false);
    };

    const handleLogout = async () => {
        // Clear local storage
        router.push("/login");

        setRoles(null)
        localStorage.removeItem('user');
        localStorage.removeItem('role');
        localStorage.removeItem('lastVisitedUrls');
        removeUserId();
        removeJwtToken();

        //setActiveProject(null);
        removeProjectId();
        removeProjectName();
        removeJwtToken();
        removeUserId();
        removeClinicId();
        removeClinicName();
        removeProductType();
        // `productType` (and the `user` it's read alongside) drive
        // ProductLayoutSwitch's PawTrack-vs-MediTrack choice — clearing them
        // synchronously here flips isHumanMode to false while the outgoing
        // page is still mounted (the /login navigation above hasn't
        // committed yet), so it briefly renders PawTrack's shell before the
        // redirect finishes. Clearing them in the same delayed batch as
        // `authorized`/`queryClient.clear()` below — by which point the
        // route has long since left this tree — avoids that flash.
        setTimeout(() => {
            setUser(null);
            setProductTypeState(null);
            queryClient.clear();
            setAuthorized(false);
            //window.location.reload();
        }, 1000)
    };

    return {
        clinic,
        loading,
        setLoading,
        collapsed,
        setCollapsed,
        user,
        setUser,
        roles,
        setRoles,
        authorized,
        handleLogout,
        fetchUser,
        IsAdmin,
        userType,
        setClinic: updateClinicAndCookies, // Use the custom update function here
        productType,
        setProductType: updateProductType,
        isHumanMode: isHumanProductType(productType),
        isVeterinaryMode: !isHumanProductType(productType),
    };
};


