'use client';

import dynamic from 'next/dynamic';
import { PlannedStop } from '@/types/planner';
import { Customer } from '@/types/customer';
import { Loader2 } from 'lucide-react';

const PlannerRouteMapInner = dynamic(() => import('./PlannerRouteMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 min-h-[300px] flex flex-col items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 space-y-2.5">
      <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      <span className="text-xs font-bold text-slate-600">กำลังโหลดแผนที่เส้นทางและระยะทาง...</span>
    </div>
  ),
});

export default function PlannerRouteMap({
  stops,
  onSelectStop,
  onAddCustomer,
  selectedDate,
}: {
  stops: PlannedStop[];
  onSelectStop?: (stop: PlannedStop) => void;
  onAddCustomer?: (customer: Customer) => void;
  selectedDate?: string;
}) {
  return (
    <PlannerRouteMapInner
      stops={stops}
      onSelectStop={onSelectStop}
      onAddCustomer={onAddCustomer}
      selectedDate={selectedDate}
    />
  );
}
