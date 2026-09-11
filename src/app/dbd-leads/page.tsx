'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import { supabase } from '@/lib/supabase';
import { DBDCompany, Customer } from '@/types/customer';
import { getDbdSearchUrl } from '@/lib/utils';
import {
  Search,
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  Plus,
  CheckCircle2,
  Building2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Eye,
  X,
  Copy,
  Check,
  Navigation,
  FileText,
  Coins,
  Calendar,
  Layers,
  ShieldCheck,
  Compass
} from 'lucide-react';
import Link from 'next/link';

export default function DBDLeadsPage() {
  const [companies, setCompanies] = useState<DBDCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState('โรงงานอุตสาหกรรมการผลิต');
  const [selectedCapital, setSelectedCapital] = useState('ALL');
  const [selectedPinType, setSelectedPinType] = useState('ALL'); // ALL, GOOGLE_BUSINESS, DBD_ADDRESS
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // Track existing customers in CRM for instant duplicate checking
  const [existingTaxIds, setExistingTaxIds] = useState<Map<string, number>>(() => new Map<string, number>());
  const [existingDbdIds, setExistingDbdIds] = useState<Map<number, number>>(() => new Map<number, number>());
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importSuccessId, setImportSuccessId] = useState<number | null>(null);

  // Detail Modal State
  const [selectedCompany, setSelectedCompany] = useState<DBDCompany | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [copiedTaxId, setCopiedTaxId] = useState(false);

  // Summary counts
  const [stats, setStats] = useState({
    totalFactories: 0,
    withPin: 0,
    googleBusinessCount: 0,
    dbdAddressCount: 0,
    inCrm: 0
  });

  const isGoogleBusinessProfile = (c: { google_maps_url?: string | null; phone?: string | null; pin_type?: string | null }) => {
    if (c.pin_type === 'DBD_ADDRESS') return false;
    if (c.pin_type === 'GOOGLE_BUSINESS') return true;
    return !!(c.google_maps_url && c.google_maps_url.includes('place_id'));
  };

  const fetchExistingCustomers = async () => {
    try {
      const { data, count } = await supabase
        .from('customers')
        .select('id, tax_id, dbd_company_id', { count: 'exact' })
        .limit(10000);

      const taxMap = new Map<string, number>();
      const dbdMap = new Map<number, number>();

      (data || []).forEach((c: any) => {
        if (c.tax_id) taxMap.set(c.tax_id, c.id);
        if (c.dbd_company_id) dbdMap.set(c.dbd_company_id, c.id);
      });

      setExistingTaxIds(taxMap);
      setExistingDbdIds(dbdMap);
      setStats((prev) => ({ ...prev, inCrm: count || (data || []).length }));
    } catch (err) {
      console.error('Error fetching existing customers:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: factoryCount } = await supabase
        .from('dbd_companies')
        .select('*', { count: 'exact', head: true })
        .eq('province', 'สมุทรปราการ')
        .eq('industry_group', 'โรงงานอุตสาหกรรมการผลิต');

      const { count: pinCount } = await supabase
        .from('dbd_companies')
        .select('*', { count: 'exact', head: true })
        .eq('province', 'สมุทรปราการ')
        .not('latitude', 'is', null);

      const { count: googleCount } = await supabase
        .from('dbd_companies')
        .select('*', { count: 'exact', head: true })
        .eq('province', 'สมุทรปราการ')
        .eq('pin_type', 'GOOGLE_BUSINESS');

      const totalF = factoryCount || 0;
      const gCount = googleCount || 0;
      const dCount = Math.max(0, (pinCount || 0) - gCount);

      setStats((prev) => ({
        ...prev,
        totalFactories: totalF,
        withPin: pinCount || 0,
        googleBusinessCount: gCount,
        dbdAddressCount: dCount
      }));
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('dbd_companies')
        .select('*', { count: 'exact' })
        .eq('province', 'สมุทรปราการ');

      if (selectedIndustry !== 'ALL') {
        query = query.eq('industry_group', selectedIndustry);
      }

      if (selectedDistrict !== 'ALL') {
        query = query.eq('district', selectedDistrict);
      }

      if (selectedCapital !== 'ALL') {
        const minCapital = parseFloat(selectedCapital);
        query = query.gte('registered_capital', minCapital);
      }

      if (selectedPinType === 'GOOGLE_BUSINESS') {
        query = query.eq('pin_type', 'GOOGLE_BUSINESS');
      } else if (selectedPinType === 'DBD_ADDRESS') {
        query = query.eq('pin_type', 'DBD_ADDRESS');
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        query = query.or(`name.ilike.%${q}%,tax_id.ilike.%${q}%,objective.ilike.%${q}%,subdistrict.ilike.%${q}%`);
      }

      // Order by capital desc
      query = query
        .order('registered_capital', { ascending: false, nullsFirst: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error('Query error:', error);
      } else {
        setCompanies(data || []);
        setTotalCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching DBD companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExistingCustomers();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [selectedDistrict, selectedIndustry, selectedCapital, selectedPinType, searchQuery, currentPage]);

  const handleImportToCrm = async (company: DBDCompany) => {
    setImportingId(company.id);
    try {
      // 1. Double check if already in CRM
      if (company.tax_id && existingTaxIds.has(company.tax_id)) {
        alert('บริษัทนี้มีอยู่ในระบบ CRM เรียบร้อยแล้ว');
        setImportingId(null);
        return;
      }

      const isGoogleBusiness = isGoogleBusinessProfile(company);

      // 2. Prepare customer payload matching exact table columns
      const noteParts = [
        isGoogleBusiness ? '📍 หมุดสถานที่จริง (Google Business Profile)' : '📍 พิกัดที่อยู่ DBD (ยังไม่ได้ลงทะเบียน Google)',
        company.registered_capital ? `💰 ทุนจดทะเบียน: ${(company.registered_capital).toLocaleString()} บาท` : null,
        company.tsic_code ? `TSIC: ${company.tsic_code}` : null
      ].filter(Boolean);

      const newCustomerPayload: any = {
        name: company.name,
        address: company.address
          ? `${company.address} ต.${company.subdistrict || ''} อ.${company.district || ''} จ.${company.province || ''} ${company.zipcode || ''}`.trim()
          : null,
        district: company.district || null,
        province: company.province || 'สมุทรปราการ',
        phone: company.phone || null,
        website: company.website || null,
        google_maps_url: company.google_maps_url || null,
        latitude: company.latitude || null,
        longitude: company.longitude || null,
        business_type: company.objective || company.industry_group || 'โรงงานอุตสาหกรรม',
        pipeline_stage: 'ยังไม่ได้ติดต่อ',
        tax_id: company.tax_id || null,
        dbd_company_id: company.id,
        place_id: isGoogleBusiness ? company.place_id : null,
        pin_type: isGoogleBusiness ? 'GOOGLE_BUSINESS' : 'DBD_ADDRESS',
        notes: noteParts.join(' | ')
      };

      const { data, error } = await supabase
        .from('customers')
        .insert([newCustomerPayload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local maps
      if (data) {
        if (company.tax_id) {
          setExistingTaxIds((prev) => new Map(prev).set(company.tax_id!, data.id));
        }
        setExistingDbdIds((prev) => new Map(prev).set(company.id, data.id));
        setStats((prev) => ({ ...prev, inCrm: prev.inCrm + 1 }));
        setImportSuccessId(company.id);
        setTimeout(() => setImportSuccessId(null), 3000);
      }
    } catch (err: any) {
      console.error('Failed to import customer:', err);
      alert('เกิดข้อผิดพลาดในการนำเข้า: ' + (err.message || ''));
    } finally {
      setImportingId(null);
    }
  };

  const handleCopyTaxId = (taxId: string) => {
    navigator.clipboard.writeText(taxId);
    setCopiedTaxId(true);
    setTimeout(() => setCopiedTaxId(false), 2000);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const districts = [
    'ALL',
    'บางพลี',
    'เมืองสมุทรปราการ',
    'พระประแดง',
    'บางเสาธง',
    'บางบ่อ',
    'พระสมุทรเจดีย์'
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col pb-20 sm:pb-8">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Header Title & Live Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  คลังข้อมูลโรงงาน DBD
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                    จ.สมุทรปราการ
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                  ค้นหาโรงงานนิติบุคคล ตรวจสอบงบการเงิน ทุนจดทะเบียน ข้อมูลติดต่อ และเปิดดูบนแผนที่ Smart Map ได้ทันที
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar with Pin Type Distribution */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400">โรงงานสมุทรปราการ</div>
              <div className="text-base sm:text-lg font-black text-slate-900">{stats.totalFactories.toLocaleString()} <span className="text-xs font-normal text-slate-400">แห่ง</span></div>
            </div>
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>หมุดธุรกิจ Google</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-700">{stats.googleBusinessCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">แห่ง</span></div>
            </div>
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>พิกัดที่อยู่ DBD</span>
              </div>
              <div className="text-base sm:text-lg font-black text-amber-700">{stats.dbdAddressCount.toLocaleString()} <span className="text-xs font-normal text-slate-400">แห่ง</span></div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-[11px] font-semibold text-blue-600">อยู่ใน Sales CRM</div>
              <div className="text-base sm:text-lg font-black text-blue-700">{stats.inCrm.toLocaleString()} <span className="text-xs font-normal text-slate-400">ราย</span></div>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงงาน, เลขนิติบุคคล, สินค้า..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            {/* 2. District Filter */}
            <div>
              <select
                value={selectedDistrict}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">📍 ทุกอำเภอในสมุทรปราการ</option>
                {districts.filter(d => d !== 'ALL').map((d) => (
                  <option key={d} value={d}>
                    อ. {d}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Capital Filter */}
            <div>
              <select
                value={selectedCapital}
                onChange={(e) => {
                  setSelectedCapital(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">💰 ทุกขนาดทุนจดทะเบียน</option>
                <option value="1000000">ทุน ≥ 1 ล้านบาท</option>
                <option value="5000000">ทุน ≥ 5 ล้านบาท</option>
                <option value="10000000">ทุน ≥ 10 ล้านบาท</option>
                <option value="50000000">ทุน ≥ 50 ล้านบาท</option>
                <option value="100000000">ทุน ≥ 100 ล้านบาท</option>
              </select>
            </div>

            {/* 4. Pin Type Filter */}
            <div>
              <select
                value={selectedPinType}
                onChange={(e) => {
                  setSelectedPinType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">🏷️ ป้ายกำกับหมุดทั้งหมด</option>
                <option value="GOOGLE_BUSINESS">🟢 เฉพาะธุรกิจลงทะเบียน Google ({stats.googleBusinessCount.toLocaleString()} แห่ง)</option>
                <option value="DBD_ADDRESS">📍 เฉพาะพิกัดตามที่อยู่ DBD ({stats.dbdAddressCount.toLocaleString()} แห่ง)</option>
              </select>
            </div>
          </div>

          {/* Quick Active Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-2 text-slate-500">
              <span>พบทั้งหมด <strong className="text-slate-900 font-bold">{totalCount.toLocaleString()}</strong> โรงงาน</span>
              {selectedDistrict !== 'ALL' && (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200/60">
                  อ.{selectedDistrict}
                </span>
              )}
              {selectedPinType === 'GOOGLE_BUSINESS' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  หมุดธุรกิจ Google
                </span>
              )}
              {selectedPinType === 'DBD_ADDRESS' && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200/60 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  พิกัดที่อยู่ DBD
                </span>
              )}
            </div>

            <button
              onClick={() => {
                fetchCompanies();
                fetchExistingCustomers();
                fetchStats();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Results List / Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลโรงงาน DBD...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="py-20 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-700 font-bold text-base">ไม่พบข้อมูลโรงงานตามเงื่อนไขที่ค้นหา</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกอำเภออื่น</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-72">ชื่อโรงงาน / นิติบุคคล</th>
                      <th className="py-3.5 px-4 w-44">ประเภทหมุด (ป้ายกำกับ)</th>
                      <th className="py-3.5 px-4">ที่ตั้ง / อำเภอ</th>
                      <th className="py-3.5 px-4 text-right w-32">ทุนจดทะเบียน</th>
                      <th className="py-3.5 px-4 max-w-xs">หมวดสินค้า / วัตถุประสงค์</th>
                      <th className="py-3.5 px-4 text-center w-28">พิกัด & ติดต่อ</th>
                      <th className="py-3.5 px-4 text-right w-44">ดำเนินการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {companies.map((c) => {
                      const inCrm = (c.tax_id && existingTaxIds.has(c.tax_id)) || existingDbdIds.has(c.id);
                      const customerId = (c.tax_id && existingTaxIds.get(c.tax_id)) || existingDbdIds.get(c.id);
                      const isImporting = importingId === c.id;
                      const isSuccess = importSuccessId === c.id;
                      const isGoogleBusiness = isGoogleBusinessProfile(c);

                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                          onClick={() => {
                            setSelectedCompany(c);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          {/* Company Name & Tax ID */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                              <span>{c.name}</span>
                              <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </div>
                            <div className="flex items-center space-x-2 mt-1.5">
                              {c.tax_id ? (
                                <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                  <span>{c.tax_id}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">ไม่ระบุเลขทะเบียน</span>
                              )}
                              {c.tsic_code && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200/60">
                                  TSIC {c.tsic_code}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Pin Type Badge */}
                          <td className="py-4 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {isGoogleBusiness ? (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>🟢 ธุรกิจลงทะเบียน Google</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span>📍 พิกัดที่อยู่ DBD</span>
                              </span>
                            )}
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4">
                            <div className="font-bold text-slate-800">
                              อ.{c.district || '-'} {c.subdistrict ? `ต.${c.subdistrict}` : ''}
                            </div>
                            <div className="text-slate-500 text-[11px] truncate max-w-xs mt-0.5" title={c.address || ''}>
                              {c.address || '-'}
                            </div>
                          </td>

                          {/* Capital */}
                          <td className="py-4 px-4 text-right">
                            {c.registered_capital ? (
                              <div>
                                <span className="font-black text-slate-900 text-sm">
                                  {(c.registered_capital / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 ml-1">ล้านบาท</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Objective */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="line-clamp-2 text-slate-600 text-[11px] leading-relaxed" title={c.objective || ''}>
                              {c.objective || c.industry_group || '-'}
                            </div>
                          </td>

                          {/* Pin & Contact */}
                          <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1.5">
                              {c.latitude && c.longitude ? (
                                <a
                                  href={c.google_maps_url || `https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`p-1.5 rounded-xl transition-all shadow-2xs ${
                                    isGoogleBusiness
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:scale-105 border border-emerald-200/60'
                                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 hover:scale-105 border border-amber-200/60'
                                  }`}
                                  title={`ดูพิกัด Google Maps (${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`}
                                >
                                  <MapPin className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="p-1.5 rounded-xl bg-slate-100 text-slate-400" title="กำลังรอประมวลผลพิกัด">
                                  <MapPin className="w-4 h-4" />
                                </span>
                              )}

                              {c.phone ? (
                                <a
                                  href={`tel:${c.phone}`}
                                  className="p-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 hover:scale-105 transition-all border border-blue-200/60 shadow-2xs"
                                  title={`โทร: ${c.phone}`}
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                              ) : null}

                              {c.website ? (
                                <a
                                  href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:scale-105 transition-all border border-indigo-200/60 shadow-2xs"
                                  title={c.website}
                                >
                                  <Globe className="w-4 h-4" />
                                </a>
                              ) : null}
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end space-x-1.5">
                              <Link
                                href="/map"
                                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 text-xs font-bold transition-all shadow-2xs"
                                title="เปิดดูบนแผนที่ Smart Map"
                              >
                                <Compass className="w-3.5 h-3.5 text-blue-600" />
                                <span>ดูบน Map</span>
                              </Link>
                              <button
                                onClick={() => {
                                  setSelectedCompany(c);
                                  setIsDetailModalOpen(true);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                                <span>ข้อมูล</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {companies.map((c) => {
                  const inCrm = (c.tax_id && existingTaxIds.has(c.tax_id)) || existingDbdIds.has(c.id);
                  const isImporting = importingId === c.id;
                  const isSuccess = importSuccessId === c.id;
                  const isGoogleBusiness = isGoogleBusinessProfile(c);

                  return (
                    <div
                      key={c.id}
                      className="p-4 space-y-3 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                      onClick={() => {
                        setSelectedCompany(c);
                        setIsDetailModalOpen(true);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h3 className="font-bold text-slate-900 text-sm leading-snug">{c.name}</h3>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {isGoogleBusiness ? (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                🟢 Google Business
                              </span>
                            ) : (
                              <span className="px-2 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                📍 ที่อยู่ DBD
                              </span>
                            )}
                            {c.tax_id && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                {c.tax_id}
                              </span>
                            )}
                          </div>
                        </div>
                        {c.registered_capital && (
                          <div className="text-right shrink-0">
                            <span className="font-black text-slate-900 text-sm">
                              {(c.registered_capital / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 block">บาท</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-500">
                        📍 อ.{c.district || '-'} {c.subdistrict ? `ต.${c.subdistrict}` : ''} ({c.address || '-'})
                      </div>

                      {c.objective && (
                        <div className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          🏭 {c.objective}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <Link
                            href="/map"
                            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 text-blue-700 bg-blue-50 border border-blue-200/80 hover:bg-blue-100 transition-colors shadow-2xs"
                          >
                            <Compass className="w-3.5 h-3.5 text-blue-600" />
                            <span>ดูบน Map</span>
                          </Link>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center space-x-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>โทร</span>
                            </a>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedCompany(c);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-600" />
                          <span>ดูข้อมูล</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  หน้า <strong className="text-slate-900 font-bold">{currentPage}</strong> จากทั้งหมด{' '}
                  <strong className="text-slate-900 font-bold">{totalPages || 1}</strong> หน้า ({totalCount.toLocaleString()} รายการ)
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-800">
                    {currentPage} / {totalPages || 1}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 🏢 DBD Company Detail Modal (หน้าต่างแสดงรายละเอียดโรงงาน DBD) */}
      {/* ========================================================================= */}
      {isDetailModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
            {/* Mobile Drag Handle */}
            <div className="sm:hidden pt-3 pb-1 flex justify-center bg-slate-50/90">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 pr-4">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                      🏛️ กรมพัฒนาธุรกิจการค้า (DBD)
                    </span>
                    {isGoogleBusinessProfile(selectedCompany) ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>🟢 ธุรกิจลงทะเบียน Google</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>📍 พิกัดที่อยู่ DBD</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                    {selectedCompany.name}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
              {/* 1. Legal & Registration Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>ข้อมูลการจดทะเบียนนิติบุคคล</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Tax ID */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                    <div className="text-[11px] font-semibold text-slate-400">เลขนิติบุคคล / Tax ID</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {selectedCompany.tax_id || '-'}
                      </span>
                      {selectedCompany.tax_id && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleCopyTaxId(selectedCompany.tax_id!)}
                            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="คัดลอกเลขทะเบียน"
                          >
                            {copiedTaxId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={getDbdSearchUrl(selectedCompany)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                            title="เปิดดูบน DBD DataWarehouse"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Registered Capital */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                    <div className="text-[11px] font-semibold text-slate-400">ทุนจดทะเบียน</div>
                    <div className="mt-1">
                      <span className="font-black text-slate-900 text-base">
                        {selectedCompany.registered_capital
                          ? (selectedCompany.registered_capital).toLocaleString()
                          : '-'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 ml-1">บาท</span>
                    </div>
                  </div>

                  {/* TSIC Code */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                    <div className="text-[11px] font-semibold text-slate-400">รหัส TSIC (หมวดหมู่ธุรกิจ)</div>
                    <div className="mt-1 font-bold text-indigo-700">
                      {selectedCompany.tsic_code ? `TSIC ${selectedCompany.tsic_code}` : '-'}
                      <span className="text-slate-600 font-normal ml-1.5">
                        ({selectedCompany.industry_group || 'การผลิต'})
                      </span>
                    </div>
                  </div>

                  {/* Registered Date */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/60">
                    <div className="text-[11px] font-semibold text-slate-400">วันที่จดทะเบียนจัดตั้ง</div>
                    <div className="mt-1 font-bold text-slate-800">
                      {selectedCompany.registered_date || (selectedCompany.batch_year ? `ปี พ.ศ. ${selectedCompany.batch_year}` : '-')}
                    </div>
                  </div>
                </div>

                {/* Objective Description */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/60">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1">วัตถุประสงค์ / สินค้าที่ผลิต</div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {selectedCompany.objective || selectedCompany.industry_group || 'ไม่ระบุรายละเอียดวัตถุประสงค์'}
                  </p>
                </div>
              </div>

              {/* 2. Location & Map Information */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>ที่ตั้งโรงงาน & ข้อมูลพิกัดแผนที่</span>
                </h3>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 space-y-2">
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <strong>ที่อยู่จดทะเบียน:</strong> {selectedCompany.address || '-'} ต.{selectedCompany.subdistrict || '-'} อ.{selectedCompany.district || '-'} จ.{selectedCompany.province || 'สมุทรปราการ'} {selectedCompany.zipcode || ''}
                  </div>

                  {selectedCompany.latitude && selectedCompany.longitude ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="font-mono text-xs text-slate-500">
                        พิกัด GPS: {selectedCompany.latitude.toFixed(6)}, {selectedCompany.longitude.toFixed(6)}
                      </div>
                      <a
                        href={selectedCompany.google_maps_url || `https://www.google.com/maps?q=${selectedCompany.latitude},${selectedCompany.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>เปิดนำทางใน Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">ยังไม่มีข้อมูลพิกัด GPS</div>
                  )}
                </div>

                {/* Contact Phone & Website if available */}
                {(selectedCompany.phone || selectedCompany.website) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedCompany.phone && (
                      <a
                        href={`tel:${selectedCompany.phone}`}
                        className="flex items-center space-x-2 p-3 rounded-xl bg-white border border-slate-200/60 text-blue-700 font-bold hover:bg-blue-50 transition-colors"
                      >
                        <Phone className="w-4 h-4 text-blue-600" />
                        <span>{selectedCompany.phone}</span>
                      </a>
                    )}
                    {selectedCompany.website && (
                      <a
                        href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-2 p-3 rounded-xl bg-white border border-slate-200/60 text-indigo-700 font-bold hover:bg-indigo-50 transition-colors truncate"
                      >
                        <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="truncate">{selectedCompany.website}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={getDbdSearchUrl(selectedCompany)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-blue-700 font-bold"
              >
                <span>🏛️ ตรวจสอบงบการเงินบน DBD DataWarehouse+</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center space-x-2">
                <Link
                  href="/map"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all hover:scale-102 active:scale-98"
                >
                  <Compass className="w-4 h-4 text-white" />
                  <span>เปิดดูบนแผนที่ Smart Map</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
