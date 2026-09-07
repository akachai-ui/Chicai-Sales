'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  FileText,
  Package,
  CalendarCheck,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'ภาพรวม (Dashboard)',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'กระดานขาย (Pipeline)',
    href: '/pipeline',
    icon: KanbanSquare,
  },
  {
    label: 'ลูกค้าสัมพันธ์ (Customers)',
    href: '/customers',
    icon: Users,
  },
  {
    label: 'ใบเสนอราคา (Quotations)',
    href: '/quotations',
    icon: FileText,
  },
  {
    label: 'สินค้า / บริการ (Products)',
    href: '/products',
    icon: Package,
  },
  {
    label: 'กิจกรรม & งาน (Activities)',
    href: '/activities',
    icon: CalendarCheck,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="no-print w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-lg text-white tracking-tight">Chicai Sales</h1>
            <span className="text-[10px] uppercase font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30 px-1.5 py-0.5 rounded">
              Pro
            </span>
          </div>
          <p className="text-xs text-slate-400">ระบบบริหารงานขาย & CRM</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          เมนูหลัก
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-400'
                  )}
                />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-brand-200" />}
            </Link>
          );
        })}
      </nav>

      {/* Quick Sales Tip / Status Box */}
      <div className="p-3 m-3 rounded-xl bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-2 text-brand-400 font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Sales Assistant</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          ติดตามลูกค้าอย่างสม่ำเสมอช่วยเพิ่มโอกาสปิดการขายได้ถึง 40%
        </p>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800 flex items-center gap-3 bg-slate-950/40">
        <div className="w-9 h-9 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-sm">
          อ
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">อัครชัย (Sales Master)</p>
          <p className="text-[11px] text-slate-400 truncate">akachai@chicai.com</p>
        </div>
      </div>
    </aside>
  );
}
