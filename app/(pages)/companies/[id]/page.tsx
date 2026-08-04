'use client'

import CompanyView from '@/components/pawtrack/companies/company-view';
import { useSearchParams } from 'next/navigation';

export default function CompanyPage() {
  const searchParams = useSearchParams();
  const companyId = searchParams.get('id') || '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <CompanyView companyId={companyId} />
    </div>
  );
}
