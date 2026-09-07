'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  Users,
  LayoutDashboard,
  Layers,
  Sparkles,
  Plus
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'หน้าหลัก', href: '/', icon: LayoutDashboard, label: 'หน้าหลัก' },
    { name: 'แผนที่', href: '/map', icon: MapPin, label: 'แผนที่' },
    { name: 'รายชื่อลูกค้า', href: '/customers', icon: Users, label: 'ลูกค้า' },
    { name: 'ประวัติเข้าพบ', href: '/activities', icon: Layers, label: 'กิจกรรม' },
  ];

  const isMapPage = pathname === '/map';

  return (
    <>
      {/* 1. Desktop Top Header (Hidden on Mobile) */}
      <header className="hidden sm:block sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">Chicai Sales</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    CRM & Field Map
                  </span>
                </div>
              </div>
            </Link>

            <nav className="flex items-center space-x-1 sm:space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* 2. Mobile Top App Bar (Only visible on Mobile when not on Map page) */}
      {!isMapPage && (
        <div className="sm:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 safe-top shadow-xs">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm shadow-blue-500/30">
                <MapPin className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base text-slate-900 tracking-tight">Chicai Sales</span>
            </Link>
            <div className="flex items-center space-x-1.5">
              <Link
                href="/map"
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/80 text-[11px] font-bold touch-press"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>เปิดแผนที่</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3. Mobile Bottom Navigation Tab Bar (iOS / Android Native Style) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <nav className="grid grid-cols-4 h-14 items-center px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 touch-press relative transition-all ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div
                  className={`w-10 h-7 flex items-center justify-center rounded-full transition-all ${
                    isActive ? 'bg-blue-100 text-blue-700 scale-105' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-bold tracking-tight mt-0.5 ${
                    isActive ? 'text-blue-700 font-extrabold' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
