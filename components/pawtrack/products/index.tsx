'use client'
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "../../ui/data-table";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2, Filter, Eye, Download } from "lucide-react";
import { useGetProducts, PaginatedResponse } from "@/queries/products/get-products";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet";
import NewProduct from "./newProduct";
import ProductDetails from "./productsDetails";
import { useDeleteProduct } from "@/queries/products/delete-products";
import { useToast } from "@/hooks/use-toast";
import { getToastErrorMessage } from "@/utils/apiErrorHandler";
import { DeleteConfirmationDialog } from "../../ui/delete-confirmation-dialog";
import { useFilter, ProductSearchParamsType } from "./hooks/useFilter";
import Loader from "@/components/ui/loader"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import * as XLSX from 'xlsx';

// Product type
export type Product = {
  id: string;
  companyId: string;
  clinicId: string;
  productNumber: string;
  name: string;
  brandName: string; // <-- Added brandName
  genericName: string;
  category: string;
  manufacturer: string;
  ndcNumber: string;
  strength: string;
  dosageForm: string;
  unitOfMeasure: string;
  requiresPrescription: boolean;
  controlledSubstanceSchedule: string;

  storageRequirements: string;
  isActive: boolean;
  reorderThreshold?: number | null; // Added optional reorderThreshold field
  price?: number; // Added price field
  sellingPrice?: number; // Added sellingPrice field
};

const PRODUCT_CATEGORIES = [
  { value: "medication", label: "Medication" },
  { value: "vaccine", label: "Vaccine" },
  { value: "supplement", label: "Supplement" },
  { value: "medical_supply", label: "Medical Supply" },
  { value: "equipment", label: "Equipment" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" }
];
export default function Products() {
  const router = useRouter();
  const { searchParam, setSearchParam } = useFilter();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const companyId =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")?.companyId
      : undefined;

 
  const { data: productsData, isLoading, isError, refetch } = useGetProducts(
    pageNumber, 
    pageSize, 
    searchParam,
    companyId
  );

  const products = productsData?.items || [];
  const totalPages = productsData?.totalPages || 1;

  const [openNew, setOpenNew] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [openDetails, setOpenDetails] = useState(false);
  const deleteProduct = useDeleteProduct();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ Filters
  const [showFilters, setShowFilters] = useState(false);
  const [nameSearch, setNameSearch] = useState(searchParam.searchByname || "");
  const [category, setCategory] = useState(searchParam.category || "");



  // remove the direct setSearchParam call from component body

  useEffect(() => {
    setSearchParam({
      searchByname: nameSearch || null,
      category: category === "all" ? null : category || null,
    });
  }, [nameSearch, category, setSearchParam]);


  const handleClearFilters = () => {
    setNameSearch("");
    setCategory("");

    setSearchParam({
      searchByname: null,
      category: null,

    });
    setPageNumber(1);
  };

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId);
    setOpenDetails(true);
  };

  const handleViewProduct = (productId: string) => {
    router.push(`/products/${productId}`);
  };

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProduct.mutateAsync({ id: productToDelete.id });
      toast({
        title: "Product Deleted",
        description: `Product ${productToDelete.name} deleted successfully`,
        variant: "success",
      });
      setIsDeleteDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: getToastErrorMessage(error, "Failed to delete product"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const handlePageChange = (page: number) => {
    setPageNumber(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(Number(newPageSize));
    setPageNumber(1);
  };

  const fetchAllProducts = async () => {
    const searchParams = searchParam.searchByname ? `searchByname=${searchParam.searchByname}&` : '';
    const categoryParams = searchParam.category ? `category=${searchParam.category}&` : '';
    const url = `/api/products?${searchParams}${categoryParams}${companyId ? `&companyId=${companyId}` : ''}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch products data');
    }
    const data = await response.json();
    return data.items || [];
  };

  const handleExportToExcel = async () => {
    if (!companyId) {
      toast({
        title: "Error",
        description: "Company ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const allProducts = await fetchAllProducts();
      
      if (allProducts.length === 0) {
        toast({
          title: "No Data",
          description: "No products found to export.",
          variant: "destructive",
        });
        return;
      }
      
      // Prepare data for Excel export
      const excelData = allProducts.map((product: Product) => ({
        'Product Number': product.productNumber,
        'Name': product.name,
        'Brand Name': product.brandName,
        'Generic Name': product.genericName,
        'Category': product.category,
        'Manufacturer': product.manufacturer,
        'NDC Number': product.ndcNumber,
        'Strength': product.strength,
        'Dosage Form': product.dosageForm,
        'Unit of Measure': product.unitOfMeasure,
        'Requires Prescription': product.requiresPrescription ? 'Yes' : 'No',
        'Controlled Substance Schedule': product.controlledSubstanceSchedule || '',
        'Storage Requirements': product.storageRequirements || '',
        'Reorder Threshold': product.reorderThreshold || '',
        'Cost Price': product.price ? product.price.toFixed(2) : '',
        'Selling Price': product.sellingPrice ? product.sellingPrice.toFixed(2) : '',
        'Active': product.isActive ? 'Yes' : 'No'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths
      const columnWidths = [
        { wch: 15 }, // Product Number
        { wch: 25 }, // Name
        { wch: 20 }, // Brand Name
        { wch: 25 }, // Generic Name
        { wch: 15 }, // Category
        { wch: 20 }, // Manufacturer
        { wch: 15 }, // NDC Number
        { wch: 15 }, // Strength
        { wch: 15 }, // Dosage Form
        { wch: 15 }, // Unit of Measure
        { wch: 18 }, // Requires Prescription
        { wch: 20 }, // Controlled Substance Schedule
        { wch: 25 }, // Storage Requirements
        { wch: 15 }, // Reorder Threshold
        { wch: 12 }, // Cost Price
        { wch: 12 }, // Selling Price
        { wch: 8 }   // Active
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      // Generate filename with current date
      const currentDate = new Date().toISOString().split('T')[0];
      const filename = `products_export_${currentDate}.xlsx`;

      // Save file
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: `Exported ${allProducts.length} products to ${filename}`,
        variant: "success",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: getToastErrorMessage(error, "Failed to export products data"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    setPageNumber(1);
  }, [
    searchParam.searchByname,
    searchParam.category,

  ]);

  const columns: ColumnDef<Product>[] = [
    { accessorKey: "name", header: "Name" },
    { accessorKey: "brandName", header: "Brand Name" }, // <-- Added Brand Name column
    { accessorKey: "genericName", header: "Generic Name" },
    { accessorKey: "category", header: "Category" },
    // { accessorKey: "brandName", header: "Brand Name" },
    // { accessorKey: "manufacturer", header: "Manufacturer" },
    // { accessorKey: "strength", header: "Strength" },
    {
      accessorKey: "price",
      header: "Cost Price",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return value ? `${value.toFixed(2)}` : '-';
      }
    },
    {
      accessorKey: "sellingPrice",
      header: "Selling Price",
      cell: ({ getValue }) => {
        const value = getValue() as number;
        return value ? `${value.toFixed(2)}` : '-';
      }
    },
    {
      accessorKey: "requiresPrescription",
      header: "Rx Required",
      cell: ({ getValue }) => <Badge variant={getValue() ? "default" : "outline"}>{getValue() ? "Yes" : "No"}</Badge>
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ getValue }) => getValue() ? 
        <Badge className="bg-[#1E3D3D] text-white hover:bg-[#1E3D3D]/80">Active</Badge> : 
        <Badge variant="destructive">Inactive</Badge>
    },
    { accessorKey: "reorderThreshold", header: "Threshold", cell: ({ getValue }) => getValue() ?? '-' },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      cell: ({ row }) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleProductClick(row.original.id);
            }} 
            title="Edit Product"
            className="text-[#1E3D3D] hover:text-[#1E3D3D] hover:bg-[#1E3D3D]/10"         
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-100"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(row.original);
            }}
            title="Delete Product"
              >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      meta: { className: "text-center" },
    },
  ];

  return (
    <div className="">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h1 className="text-2xl font-bold">Product</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
          <Sheet open={openNew} onOpenChange={setOpenNew}>
            <SheetTrigger asChild>
              <Button className="theme-button text-white">
                <Plus className="mr-2 h-4 w-4" />Add Product
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full md:!max-w-[50%] lg:!max-w-[37%]"
            >
              <SheetHeader className="relative top-[-14px]">
                <SheetTitle>New Product</SheetTitle>
              </SheetHeader>
              <NewProduct 
                onSuccess={() => {
                  setOpenNew(false);
                  refetch();
                }}
                onCancel={() => {
                  setOpenNew(false);
                }}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ✅ Filters Section (with Price Range like Expense) */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Filters</h3>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name-search">Product Name</Label>
              <Input
                id="name-search"
                placeholder="Search by product name..."
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </div>

        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader size="lg" label="Loading products..." />
        </div>
      ) : isError ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-red-500 text-center">Error loading products</p>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 p-6">
          <DataTable
            columns={columns}
            data={products as Product[]}
            searchColumn="name"
            searchPlaceholder="Search products..."
            page={pageNumber}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={(row) => handleViewProduct(row.id)}
          />
        </div>
      )}

      {/* Product Details */}
      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent
          side="right"
          className="w-full md:!max-w-[80%] lg:!max-w-[50%]"
        >
          <SheetHeader className="relative top-[-10px]">
            <SheetTitle>Product Details</SheetTitle>
          </SheetHeader>
          {selectedProductId && (
            <ProductDetails
              productId={selectedProductId}
              onSuccess={() => setOpenDetails(false)}
              onCancel={() => setOpenDetails(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        itemName={productToDelete?.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}