'use client'
import React, { useState } from "react";
import { Button } from "../../ui/button";
import { Plus, Download } from "lucide-react";
import * as XLSX from 'xlsx';
import { toast } from "../../ui/use-toast";
import { Company, useGetCompanies } from "@/queries/companies/get-company";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet";
import CompaniesScreen from "./companies-screen";
import NewCompany from "./new-company";
import CompanyDetails from "./company-details";
 


export default function CompaniesPage() {
  const [openNew, setOpenNew] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isExporting, setIsExporting] = useState(false);
   const { data, isLoading, isError } = useGetCompanies(true, 1, 10);

const handleExportToExcel = async () => {
  try { 
    console.log('Export button clicked');
    console.log('Current data:', data);
    setIsExporting(true);
    
    // Get the companies data from the response
    const companies = data?.items || [];
    
    if (!companies || companies.length === 0) {
      toast({
        title: 'No data to export',
        description: 'There are no companies to export',
        variant: 'default',
      });
      return;
    }
    
    // Format the data for Excel export
    const formattedData = companies.map((company: Company) => ({
      'Company Name': company.name,
      'Email': company.email,
      'Phone': company.phone,
      'City': company.address?.city || '',
      'State': company.address?.state || '',
      'Status': company.status ? company.status.charAt(0).toUpperCase() + company.status.slice(1) : ''
    }));
    
    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Set column widths
    const colWidths = [
      { wch: 30 }, // Company Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 20 }, // City
      { wch: 15 }, // State
      { wch: 10 }  // Status
    ];
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Companies');
    
    // Generate Excel file and trigger download
    const fileName = `companies_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: 'Export successful',
      description: `${companies.length} companies have been exported to Excel`,
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    toast({
      title: 'Export failed',
      description: 'There was an error exporting the data. Please try again.',
      variant: 'destructive',
    });
  } finally {
    setIsExporting(false);
  }
};

  const handleEditCompany = (company: Company | null) => {
    setSelectedCompany(company);
    setOpenNew(!company);
    setOpenDetails(!!company);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-gradient-to-r from-slate-50 to-[#D2EFEC] dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex-1">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-800 dark:from-slate-100 dark:to-blue-100 bg-clip-text text-transparent">
            Companies
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportToExcel}
            disabled={isExporting}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export to Excel'}
          </Button>
          <Button
            className="theme-button text-white"
            onClick={() => handleEditCompany(null)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Company
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto border-none bg-slate-50 dark:bg-slate-900 p-6">
        <CompaniesScreen onEditCompany={handleEditCompany} />
      </div>

      {/* Add Company Sheet */}
      <Sheet open={openNew} onOpenChange={setOpenNew}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[62%]">
          <SheetHeader>
            <SheetTitle className="relative top-[-14px]">New Company</SheetTitle>
          </SheetHeader>
          <NewCompany onSuccess={() => setOpenNew(false)} />
        </SheetContent>
      </Sheet>

      {/* Edit Company Sheet */}
      <Sheet open={openDetails} onOpenChange={setOpenDetails}>
        <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[62%]">
          <SheetHeader>
            <SheetTitle className="relative top-[-14px]">Edit Company</SheetTitle>
          </SheetHeader>
          {selectedCompany && (
            <CompanyDetails
              companyId={selectedCompany.id}
              onSuccess={() => setOpenDetails(false)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
