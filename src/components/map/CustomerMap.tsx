'use client';

import dynamic from 'next/dynamic';
import { Customer, DBDCompany } from '@/types/customer';
import { Loader2 } from 'lucide-react';

const CustomerMapInner = dynamic(() => import('./CustomerMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 space-y-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm font-semibold text-slate-600">กำลังโหลดแผนที่และหมุดโรงงาน 3,100+ แห่ง...</p>
    </div>
  ),
});

export default function CustomerMap({
  initialCustomers,
  initialDbdCompanies = [],
}: {
  initialCustomers: Customer[];
  initialDbdCompanies?: DBDCompany[];
}) {
  return <CustomerMapInner initialCustomers={initialCustomers} initialDbdCompanies={initialDbdCompanies} />;
}
