'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import CustomerMap from '@/components/map/CustomerMap';
import { supabase, fetchAllCustomers } from '@/lib/supabase';
import { Customer } from '@/types/customer';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function MapPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllCustomers();
      setCustomers(data || []);
    } catch (err: any) {
      console.error('Error fetching customers for map:', err);
      setError(err.message || 'ไม่สามารถโหลดข้อมูลลูกค้าได้');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 relative flex flex-col">
        {loading ? (
          <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="text-base font-bold text-slate-800">กำลังเชื่อมต่อฐานข้อมูล Supabase...</p>
              <p className="text-xs text-slate-500 mt-1">กำลังโหลดหมุดโรงงาน 1,000+ แห่งบนแผนที่</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">เกิดข้อผิดพลาดในการโหลดข้อมูล</h3>
            <p className="text-sm text-slate-600 max-w-md mt-1">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>ลองใหม่อีกครั้ง</span>
            </button>
          </div>
        ) : (
          <CustomerMap initialCustomers={customers} />
        )}
      </main>
    </div>
  );
}
