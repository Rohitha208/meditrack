'use client'
import { useState } from 'react';
import RootPageContext from "@/context/RootContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export default function QueryWrapper({ children }: { children: React.ReactNode }) {
    // Create QueryClient with global error handling
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                retry: (failureCount, error: any) => {
                    // Don't retry on 401 errors
                    if (error?.status === 401 || error?.response?.status === 401) {
                        // Token expiration is already handled by useContentLayout and privateRouter
                        return false;
                    }
                    return failureCount < 3;
                }
            },
            mutations: {
                retry: (failureCount, error: any) => {
                    // Don't retry on 401 errors
                    if (error?.status === 401 || error?.response?.status === 401) {
                        // Token expiration is already handled by useContentLayout and privateRouter
                        return false;
                    }
                    return failureCount < 3;
                }
            }
        }
    }));

    return (
        <QueryClientProvider client={queryClient}>
            <RootPageContext>
                {children}
            </RootPageContext>
        </QueryClientProvider>
    );
}