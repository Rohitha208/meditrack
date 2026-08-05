'use client';

import React, { createContext, useState, useMemo, useContext } from 'react';
import { useContentLayout, UserType, ProductType } from '../hooks/useContentLayout';


interface RootContextTypeProps {
    children: any
}

export type RootContextType = {
    user: any
    roles: any
    IsAdmin: boolean | null
    authorized: boolean
    clinic: {
        id: string | null
        name: string | null
        companyId?: string | null
        setClinic?: (clinic: {id: string | null, name: string | null, companyId?: string | null}) => void
    }
    collapsed: boolean
    setCollapsed: any
    loading: boolean
    setLoading: any
    setUser: any
    setRoles: any
    handleLogout: any
    fetchUser: (data: any, role? :any) => any,
    userType: any,
    productType: ProductType | null
    setProductType: (productType?: ProductType | string | null) => void
    isHumanMode: boolean
    isVeterinaryMode: boolean

};

export const RootContext = createContext<RootContextType | undefined>(undefined);

const RootPageContext: React.FC<RootContextTypeProps> = ({ children }) => {
    const contentLayout = useContentLayout();
    const contextValue = useMemo(() => ({
        user: contentLayout.user,
        roles: contentLayout.roles,
        clinic: {
            ...contentLayout.clinic,
            setClinic: contentLayout.setClinic
        },
        IsAdmin: contentLayout.IsAdmin,
        authorized: contentLayout.authorized,
        collapsed: contentLayout.collapsed,
        setCollapsed: contentLayout.setCollapsed,
        loading: contentLayout.loading,
        setLoading: contentLayout.setLoading,
        setUser: contentLayout.setUser,
        setRoles: contentLayout.setRoles,
        handleLogout: contentLayout.handleLogout,
        fetchUser: contentLayout.fetchUser,
        userType: contentLayout.userType,
        productType: contentLayout.productType,
        setProductType: contentLayout.setProductType,
        isHumanMode: contentLayout.isHumanMode,
        isVeterinaryMode: contentLayout.isVeterinaryMode,

    }), [
        contentLayout.user,
        contentLayout.roles,
        contentLayout.IsAdmin,
        contentLayout.authorized,
        contentLayout.collapsed,
        contentLayout.productType,
        contentLayout.loading,
        contentLayout.clinic,
    ]);

    return (
        <RootContext.Provider value={{ ...contextValue }}>
            {children}
        </RootContext.Provider>
    );
};


export function useRootContext() {
    const context = useContext(RootContext);
    if (context === undefined) {
        throw new Error('useRootContext must be used within a RootPageContext');
    }
    return context;
}

export default RootPageContext;