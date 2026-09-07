'use client';

import React, { useState } from 'react';
import { 
  Bell, 
  Search, 
  Plus, 
  Calendar, 
  RotateCcw, 
  Briefcase, 
  UserPlus, 
  FilePlus, 
  CheckSquare 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useSalesStore } from '@/lib/store';
import Link from 'next/link';

export default function Header() {
  const { activities, resetToSampleData } = useSalesStore();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const pendingActivities = activities.filter(a => !a.completed).length;

  const handleReset = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้น (Demo Data) หรือไม่?')) {
      resetToSampleData();
      alert('รีเซ็ตข้อมูลตัวอย่างเรียบร้อยแล้ว');
      window.location.reload();
    }
  };

  return (
    <header className="no-print h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Left section: Date badge & Search */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-brand-600" />
          <span>{formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Right section: Actions & Notifications */}
      <div className="flex items-center gap-3">
        {/* Reset Demo Data Button */}
        <button
          onClick={handleReset}
          title="รีเซ็ตข้อมูลตัวอย่าง"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">รีเซ็ตข้อมูล</span>
        </button>

        {/* Notifications badge */}
        <Link 
          href="/activities" 
          className="relative p-2 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="งานที่ต้องติดตาม"
        >
          <Bell className="w-4 h-4" />
          {pendingActivities > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
              {pendingActivities}
            </span>
          )}
        </Link>

        {/* Quick Add Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>สร้างใหม่</span>
          </button>

          {showQuickMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowQuickMenu(false)} 
              />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95">
                <Link
                  href="/pipeline?action=new"
                  onClick={() => setShowQuickMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 hover:text-brand-600 font-medium transition-colors"
                >
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span>สร้างดีลใหม่ (New Deal)</span>
                </Link>
                <Link
                  href="/customers?action=new"
                  onClick={() => setShowQuickMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 hover:text-brand-600 font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-emerald-500" />
                  <span>เพิ่มลูกค้าใหม่ (New Customer)</span>
                </Link>
                <Link
                  href="/quotations/new"
                  onClick={() => setShowQuickMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 hover:text-brand-600 font-medium transition-colors"
                >
                  <FilePlus className="w-4 h-4 text-purple-500" />
                  <span>ออกใบเสนอราคา (New Quotation)</span>
                </Link>
                <Link
                  href="/activities?action=new"
                  onClick={() => setShowQuickMenu(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 hover:text-brand-600 font-medium transition-colors"
                >
                  <CheckSquare className="w-4 h-4 text-amber-500" />
                  <span>บันทึกงาน / การโทร (New Task)</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
