'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, LayoutDashboard, Users, Star } from 'lucide-react';
import { getMyPortfolioIds, subscribeToPortfolioChanges } from '@/lib/portfolio';

export default function Navbar() {
  const pathname = usePathname();
  const [portfolioCount, setPortfolioCount] = useState<number>(0);

  useEffect(() => {
    setPortfolioCount(getMyPortfolioIds().length);
    const unsubscribe = subscribeToPortfolioChanges((ids) => {
      setPortfolioCount(ids.length);
    });
    return () => unsubscribe();
  }, []);

  const navItems = [
    { name: 'หน้าหลัก', href: '/', icon: LayoutDashboard, label: 'หน้าหลัก' },
    { name: 'แผนที่', href: '/map', icon: MapPin, label: 'แผนที่' },
    { name: 'ลูกค้าของฉัน', href: '/my-customers', icon: Users, label: 'ลูกค้าของฉัน', badge: portfolioCount },
  ];

  const isMapPage = pathname === '/map';

  return (
    <>
      {/* 1. Desktop Top Header (Hidden on Mobile) */}
      <header className="hidden sm:block sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="h-9 px-2 py-1 rounded-xl bg-slate-900/5 flex items-center justify-center border border-slate-200/60 shadow-xs group-hover:scale-105 transition-transform">
                <img src="/images/logo.png" alt="Chicai Logo" className="h-7 w-auto object-contain" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">Chicai Sales</span>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-[#148277] border border-teal-200">
                    Field Map & CRM
                  </span>
                </div>
              </div>
            </Link>

            <nav className="flex items-center space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all relative ${
                      isActive
                        ? 'bg-[#1b9b8e] text-white shadow-sm shadow-[#1b9b8e]/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                          isActive
                            ? 'bg-white text-[#148277]'
                            : 'bg-teal-100 text-[#148277]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* 2. Mobile Top App Bar (Only visible on Mobile when not on Map page) */}
      {!isMapPage && (
        <div className="sm:hidden sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-2.5 safe-top shadow-xs">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 px-1.5 py-0.5 rounded-lg bg-slate-900/5 flex items-center justify-center border border-slate-200/60 shadow-xs">
                <img src="/images/logo.png" alt="Chicai Logo" className="h-6 w-auto object-contain" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">Chicai Sales</span>
            </Link>
            <div className="flex items-center space-x-1.5">
              <Link
                href="/map"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#1b9b8e] text-white text-xs font-bold shadow-xs touch-press"
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
        <nav className="grid grid-cols-3 h-14 items-center px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 touch-press relative transition-all ${
                  isActive ? 'text-[#1b9b8e]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <div
                  className={`w-10 h-6 flex items-center justify-center rounded-full transition-all relative ${
                    isActive ? 'bg-teal-50 text-[#148277] scale-105' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-extrabold bg-[#1b9b8e] text-white border border-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold tracking-tight mt-0.5 truncate ${
                    isActive ? 'text-[#148277] font-extrabold' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <span className="absolute top-1 right-1/4 w-1.5 h-1.5 rounded-full bg-[#1b9b8e]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
