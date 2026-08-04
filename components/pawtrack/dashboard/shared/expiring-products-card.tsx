"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ExpiringProduct, useExpiringProducts } from "@/queries/dashboard/get-expiring-products";
import { useRootContext } from "@/context/RootContext";
import { useEffect, useState } from "react";

interface ExpiringProductsCardProps {
  className?: string;
  visible?: boolean;
  clinicId?: string;
  products?: ExpiringProduct[];
}

export function ExpiringProductsCard({ 
  className, 
  visible = true,
  clinicId,
  products: providedProducts
}: ExpiringProductsCardProps) {
  if (!visible) return null;
  const { clinic } = useRootContext();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const effectiveClinicId = clinicId || clinic?.id || "";
  const hasProvidedProducts = Array.isArray(providedProducts);

  const { data: fetchedProducts = [], isLoading, error } = useExpiringProducts(
    !hasProvidedProducts && hasMounted && effectiveClinicId ? effectiveClinicId : ""
  );

  const products = hasProvidedProducts ? providedProducts : fetchedProducts;

  useEffect(() => {
    if (products.length > 0) {
      console.log('ExpiringProductsCard - Products loaded:', products);
    }
  }, [products]);

  if (error) {
    console.error('ExpiringProductsCard - Error:', error);
  }

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (days: number) => {
    if (days <= 0) return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    if (days <= 7) return "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400";
    if (days <= 30) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
  };

  const getStatusText = (days: number, expiryDate: string) => {
    // Handle the date string format "2025-12-31T00:00:00"
    const date = new Date(expiryDate);
    let formattedDate = 'Invalid date';

    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } else {
      // Fallback to raw date string if parsing fails
      formattedDate = expiryDate.split('T')[0]; // Just get the date part before 'T'
    }

    if (days <= 0) return `Expired on ${formattedDate}`;
    return `Expires ${formattedDate}`;
  };

  const criticalItems = products.filter(p => {
    const days = getDaysUntilExpiry(p.expirationDate);
    return days <= 7;
  }).length;

  if (!hasProvidedProducts && isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse h-10 w-10 rounded-lg bg-gray-200" />
            <div>
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-200 rounded mt-1" />
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (!hasProvidedProducts && error) {
    return (
      <Card className={className}>
        <CardHeader className="p-4 pb-2">
          <div className="text-red-500 text-sm">Failed to load expiring products</div>
        </CardHeader>
      </Card>
    );
  }

  if (products.length === 0) return null;

  return (
    <Card className={className}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${criticalItems > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
              }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">Products Expiring Soon</h3>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-3">
          {products.length > 0 ? (
            <div className="divide-y">
              {products.slice(0, 5).map((product) => {
                const daysUntilExpiry = getDaysUntilExpiry(product.expirationDate);
                return (
                  <div key={product.inventoryId} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{product.product.name}</p>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span>Batch: {product.batchNumber || 'N/A'}</span>
                          <span>•</span>
                          <span>Qty: {product.quantityOnHand}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${getStatusColor(daysUntilExpiry)
                        }`}>
                        {getStatusText(daysUntilExpiry, product.expirationDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No products expiring soon</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}