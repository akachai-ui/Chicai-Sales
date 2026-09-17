'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import CustomerMap from '@/components/map/CustomerMap';
import { fetchAllCustomers, fetchAllDbdCompanies } from '@/lib/supabase';
import { Customer, DBDCompany } from '@/types/customer';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function MapPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dbdCompanies, setDbdCompanies] = useState<DBDCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [crmData, dbdData] = await Promise.all([
        fetchAllCustomers(),
        fetchAllDbdCompanies(),
      ]);
      setCustomers(crmData || []);
      setDbdCompanies(dbdData || []);
    } catch (err: any) {
      console.error('Error fetching data for dual map:', err);
      setError(err.message || 'Unable to load map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1 relative flex flex-col">
        {loading ? (
          <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#1b9b8e]" />
            <div className="text-center">
              <p className="text-base font-bold text-slate-800">Connecting to Smart Map Data...</p>
              <p className="text-xs text-slate-500 mt-1">
                Loading CRM customers & 3,100+ industrial factories
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Failed to Load Map Data</h3>
            <p className="text-sm text-slate-600 max-w-md mt-1">{error}</p>
            <button
              onClick={fetchMapData}
              className="mt-4 flex items-center space-x-2 px-4 py-2 bg-[#1b9b8e] text-white text-xs font-semibold rounded-xl hover:bg-[#148277] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        ) : (
          <CustomerMap initialCustomers={customers} initialDbdCompanies={dbdCompanies} />
        )}
      </main>
    </div>
  );
}
