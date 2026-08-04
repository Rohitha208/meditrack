'use client';

import { useParams } from 'next/navigation';
import { useGetProductById } from '@/queries/products/get-product-by-id';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProductCodes from '@/components/pawtrack/products/ProductCodes';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { data: product, isLoading, isError } = useGetProductById(productId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading product details...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Product not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className='border p-4 rounded-md'>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Button>
          
        </div>
        <Button
          onClick={() => router.push(`/products/${productId}/edit`)}
          className="flex items-center gap-2 bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80"
        >
          <Edit className="h-4 w-4" />
          Edit Product
        </Button>
      </div>

      {/* Product Information */}
        <div>
            
        </div>
        
        {/* <h1 className="text-xl font-bold mb-2">{product.name}</h1> */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
        {/* Basic Information */}
        <Card>
          <CardHeader className='border-b p-4'>
            <CardTitle className="text-xl">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Product Number</label>
                <p className="text-lg font-bold">{product.productNumber || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Brand Name</label>
                <p className="text-lg font-bold">{product.brandName || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Generic Name</label>
                <p className="text-lg font-bold">{product.genericName || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Category</label>
                <p className="text-lg font-bold">{product.category || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Price</label>
                <p className="text-lg font-bold">${product.price || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medical Information */}
        <Card>
          <CardHeader className='border-b p-4'>
            <CardTitle className="text-xl">Medical Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">NDC Number</label>
                <p className="text-lg font-bold">{product.ndcNumber || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Dosage Form</label>
                <p className="text-lg font-bold">{product.dosageForm || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Unit of Measure</label>
                <p className="text-lg font-bold">{product.unitOfMeasure || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Reorder Threshold</label>
                <p className="text-lg font-bold">{product.reorderThreshold || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Controlled Substance Schedule</label>
                <p className="text-lg font-bold">{product.controlledSubstanceSchedule || '-'}</p>
              </div>
              <div className='border p-2 rounded-md'>
                <label className="text-sm font-medium text-muted-foreground">Storage Requirements</label>
                <p className="text-lg font-bold">{product.storageRequirements || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card>
          <CardHeader className='border-b p-4'>
            <CardTitle className="text-xl">Status & Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between border p-2 rounded-md">
              <span className="text-sm font-medium">Requires Prescription</span>
              {product.requiresPrescription ? 
                <Badge className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80">Yes</Badge> : 
                <Badge variant="outline">No</Badge>
              }
            </div>
            <div className="flex items-center justify-between border p-2 rounded-md">
              <span className="text-sm font-medium">Status</span>
              {product.isActive ? 
                <Badge className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80">Active</Badge> : 
                <Badge variant="destructive">Inactive</Badge>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Codes Section */}
      <ProductCodes 
        productId={productId}
        productNumber={product.productNumber}
        productName={product.name}
      />
      </div>
    </div>
  );
} 