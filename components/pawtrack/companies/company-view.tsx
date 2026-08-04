'use client'
import { useGetCompanyById } from "@/queries/companies/get-company";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Separator } from "../../ui/separator";
import {
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
  Hash,
  Calendar,
  Edit,
  ArrowLeft,
  Eye,
  Download
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../../ui/sheet";
import { useState } from "react";
import CompanyDetails from "./company-details";
import { CompanyLogo } from "@/components/pawtrack/company-logo";

interface CompanyViewProps {
  companyId: string;
}

export default function CompanyView({ companyId }: CompanyViewProps) {
  const router = useRouter();
  const [openEdit, setOpenEdit] = useState(false);
  const { data: company, isLoading, isError } = useGetCompanyById(companyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading company details...</p>
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Company not found</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleViewPDF = (base64Data: string, filename: string) => {
    const pdfData = `data:application/pdf;base64,${base64Data}`;
    window.open(pdfData, '_blank');
  };

  const handleDownloadPDF = (base64Data: string, filename: string) => {
    const pdfData = `data:application/pdf;base64,${base64Data}`;
    const link = document.createElement('a');
    link.href = pdfData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {company?.name || 'Company Details'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Company Details
              </p>
            </div>
          </div>
          <Sheet open={openEdit} onOpenChange={setOpenEdit}>
            <SheetTrigger asChild>
              <Button className="theme-button text-white shrink-0">
                <Edit className="mr-2 h-4 w-4" /> Edit Company
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-full md:!max-w-[50%] lg:!max-w-[62%] overflow-auto">
              <SheetHeader>
                <SheetTitle>Edit Company</SheetTitle>
              </SheetHeader>
              <CompanyDetails
                companyId={companyId}
                onSuccess={() => setOpenEdit(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Information */}
          <div className="xl:col-span-3 space-y-6">
            {/* Basic Information Card */}
            <Card className="shadow-sm border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5 text-blue-600" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Status</span>
                  <Badge
                    variant={company.status === "active" ? "default" : "secondary"}
                    className={company.status === "active" ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                  >
                    {company.status}
                  </Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Domain</span>
                  <span className="text-gray-900 dark:text-white font-mono text-sm">
                    {company.domainName}
                  </span>
                </div>

                <Separator />

                <div>
                  <span className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</span>
                  <p className="mt-2 text-gray-900 dark:text-white leading-relaxed">
                    {company.description}
                  </p>
                </div>

                {company.logoUrl && (
                  <>
                    <Separator />
                    <div>
                      <span className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Logo</span>
                      <div className="mt-3">
                        <CompanyLogo
                          logoUrl={company.logoUrl}
                          companyName={company.name}
                          context="company-view"
                          fallbackSrc="/images/logo.png"
                          width={80}
                          height={80}
                          className="h-20 w-20 object-contain rounded-lg border-2 border-gray-200 dark:border-gray-600 p-2 bg-gray-50 dark:bg-gray-700"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact Information Card */}
            <Card className="shadow-sm border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</span>
                    <p className="text-gray-900 dark:text-white mt-1 break-all">{company.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</span>
                    <p className="text-gray-900 dark:text-white mt-1">{company.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information Card */}
            <Card className="shadow-sm border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-red-600" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="text-gray-900 dark:text-white font-medium">
                        {company.address.street}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        {company.address.city}, {company.address.state} {company.address.postalCode}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 font-medium">
                        {company.address.country}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Documents Card */}
            {(company.privacyPolicy || company.termsOfUse) && (
              <Card className="shadow-sm border-0 bg-white dark:bg-gray-800">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                    Legal Documents
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {company.privacyPolicy && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-red-500" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Privacy Policy</span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">PDF Document</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPDF(company.privacyPolicy!, 'privacy-policy.pdf')}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(company.privacyPolicy!, 'privacy-policy.pdf')}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {company.termsOfUse && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-red-500" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Terms of Use</span>
                          <p className="text-sm text-gray-500 dark:text-gray-400">PDF Document</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewPDF(company.termsOfUse!, 'terms-of-use.pdf')}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(company.termsOfUse!, 'terms-of-use.pdf')}
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-6">
            {/* Registration Details Card */}
            <Card className="shadow-sm border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Registration Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Hash className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Registration Number</span>
                      <p className="text-gray-900 dark:text-white font-mono text-sm mt-1 break-all">
                        {company.registrationNumber}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card className="shadow-sm border-0 bg-white dark:bg-gray-800">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</span>
                      <p className="text-gray-900 dark:text-white text-sm mt-1">
                        {formatDate(company.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Updated</span>
                      <p className="text-gray-900 dark:text-white text-sm mt-1">
                        {formatDate(company.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
