'use client';

import { useParams, useRouter } from 'next/navigation';
import ProductDetails from '@/components/pawtrack/products/productsDetails';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const handleSuccess = () => {
    router.push(`/products/${productId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Product</h1>
          <p className="text-muted-foreground">Update product information</p>
        </div>
      </div>

      {/* Product Details Form */}
      <ProductDetails
        productId={productId}
        onSuccess={handleSuccess}
      />
    </div>
  );
} 