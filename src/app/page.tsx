'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import { supabase, fetchAllCustomers, subscribeToRealtimeChanges } from '@/lib/supabase';
import { Customer, PIPELINE_STAGES } from '@/types/customer';
import {
  MapPin,
  Users,
  TrendingUp,
  PhoneCall,
  CalendarCheck,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Building,
  Target,
  Compass,
  Layers,
  Radio
} from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchAllCustomers();
      if (data) setCustomers(data as Customer[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to real-time changes
    const unsubscribe = subscribeToRealtimeChanges(['customers', 'customer_activities'], () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);


  const totalCount = customers.length;
  const stageStats: Record<string, number> = {};
  const districtStats: Record<string, number> = {};

  customers.forEach((c) => {
    const stage = c.pipeline_stage || 'ยังไม่ได้ติดต่อ';
    stageStats[stage] = (stageStats[stage] || 0) + 1;

    const district = c.district || 'ไม่ระบุโซน';
    districtStats[district] = (districtStats[district] || 0) + 1;
  });

  const sortedDistricts = Object.entries(districtStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-8">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 w-full flex-1 space-y-4 sm:space-y-8">
        
        {/* Hero Banner / Mobile Welcome Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1b9b8e] via-teal-800 to-slate-900 text-white p-5 sm:p-10 shadow-lg sm:shadow-xl shadow-teal-900/10">
          <div className="relative z-10 max-w-2xl space-y-3 sm:space-y-4">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <div className="inline-flex items-center bg-white/95 rounded-xl px-2.5 py-1 shadow-sm">
                <img src="/images/logo.png" alt="Chicai Logo" className="h-5 w-auto object-contain" />
              </div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[11px] sm:text-xs font-semibold text-teal-200">
                <Sparkles className="w-3 h-3 text-teal-300" />
                <span>Chicai Field CRM & Smart Map</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              ระบบบริหารงานขาย & แผนที่โรงงาน
            </h1>
            <p className="text-xs sm:text-base text-teal-100/90 leading-relaxed">
              ติดตามสถานะลูกค้า วางแผนเส้นทางเข้าพบ และบันทึกประวัติการขาย 1,089 โรงงาน
            </p>
            <div className="flex flex-wrap gap-2 sm:gap-3 pt-1 sm:pt-2">
              <Link
                href="/map"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-white text-[#148277] font-bold text-sm shadow-md hover:bg-teal-50 transition-all touch-press"
              >
                <MapPin className="w-4 h-4 text-[#1b9b8e]" />
                <span>เปิดแผนที่โรงงาน</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden lg:flex items-center justify-center">
            <Compass className="w-96 h-96 text-white" />
          </div>
        </div>

        {/* Mobile Quick Action Button */}
        <div className="sm:hidden">
          <Link
            href="/map"
            className="w-full bg-[#1b9b8e] text-white p-3.5 rounded-2xl shadow-md flex items-center justify-center space-x-2 font-bold text-sm touch-press"
          >
            <MapPin className="w-4 h-4" />
            <span>เข้าสู่ระบบแผนที่โรงงาน</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">โรงงานทั้งหมด</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-[#148277] flex items-center justify-center">
                <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : totalCount}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">พร้อมพิกัด & เบอร์</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">ยังไม่ได้ติดต่อ</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-slate-700">
              {loading ? '...' : (stageStats['ยังไม่ได้ติดต่อ'] || 0)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">Lead รอโทรเปิดงาน</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">นัดหมาย Demo</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-[#148277] flex items-center justify-center">
                <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-[#1b9b8e]">
              {loading ? '...' : (stageStats['นัดหมาย Demo On-site'] || 0)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">นัดสาธิตเครื่อง</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">ปิดการขายสำเร็จ</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-emerald-600">
              {loading ? '...' : (stageStats['ปิดการขาย (สำเร็จ)'] || 0)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">ลูกค้าปัจจุบัน</span>
          </div>
        </div>

        {/* Section: Pipeline Distribution & Top Districts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Pipeline Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center space-x-2">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-[#1b9b8e]" />
                <span>สถานะ Sales Pipeline ทั้งหมด</span>
              </h3>
              <Link href="/map" className="text-xs font-semibold text-[#148277] hover:underline">
                ดูบนแผนที่
              </Link>
            </div>

            <div className="space-y-2.5 sm:space-y-3 pt-1">
              {PIPELINE_STAGES.map((s) => {
                const count = stageStats[s.stage] || 0;
                const pct = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0';
                return (
                  <div key={s.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${s.dot}`} />
                        <span className="text-slate-700 text-[11px] sm:text-xs">{s.stage}</span>
                      </div>
                      <span className="text-slate-900 font-bold text-[11px] sm:text-xs">{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 sm:h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${s.dot}`}
                        style={{ width: `${Math.max(2, parseFloat(pct))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Factory Districts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#1b9b8e]" />
                <span>การกระจายตัวตามอำเภอ / โซน</span>
              </h3>
              <Link href="/map" className="text-xs font-semibold text-[#148277] hover:underline">
                สำรวจพื้นที่
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
              {sortedDistricts.map(([district, count]) => (
                <Link
                  key={district}
                  href={`/map`}
                  className="p-3 sm:p-3.5 rounded-xl bg-slate-50 hover:bg-teal-50/50 border border-slate-200/80 hover:border-teal-200 transition-all group touch-press"
                >
                  <span className="text-[10px] sm:text-xs text-slate-500 block">อำเภอ/โซน</span>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#148277] truncate mt-0.5">
                    {district}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-1">
                    {count} โรงงาน
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
