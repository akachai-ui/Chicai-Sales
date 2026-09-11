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
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

export default function DBDLeadsPage() {
  const [companies, setCompanies] = useState<DBDCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedIndustry, setSelectedIndustry] = useState('โรงงานอุตสาหกรรมการผลิต');
  const [selectedCapital, setSelectedCapital] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // Track existing customers in CRM for instant duplicate checking
  const [existingTaxIds, setExistingTaxIds] = useState<Map<string, number>>(new Map());
  const [existingDbdIds, setExistingDbdIds] = useState<Map<number, number>>(new Map());
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importSuccessId, setImportSuccessId] = useState<number | null>(null);

  // Summary counts
  const [stats, setStats] = useState({
    totalFactories: 0,
    withPin: 0,
    inCrm: 0
  });

  const fetchExistingCustomers = async () => {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, tax_id, dbd_company_id');

      const taxMap = new Map<string, number>();
      const dbdMap = new Map<number, number>();

      (data || []).forEach((c: any) => {
        if (c.tax_id) taxMap.set(c.tax_id, c.id);
        if (c.dbd_company_id) dbdMap.set(c.dbd_company_id, c.id);
      });

      setExistingTaxIds(taxMap);
      setExistingDbdIds(dbdMap);
      setStats((prev) => ({ ...prev, inCrm: (data || []).length }));
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

      setStats((prev) => ({
        ...prev,
        totalFactories: factoryCount || 0,
        withPin: pinCount || 0
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

      if (selectedStatus === 'HAS_PIN') {
        query = query.not('latitude', 'is', null);
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
  }, [selectedDistrict, selectedIndustry, selectedCapital, selectedStatus, searchQuery, currentPage]);

  const handleImportToCrm = async (company: DBDCompany) => {
    setImportingId(company.id);
    try {
      // 1. Double check if already in CRM
      if (company.tax_id && existingTaxIds.has(company.tax_id)) {
        alert('บริษัทนี้มีอยู่ในระบบ CRM เรียบร้อยแล้ว');
        setImportingId(null);
        return;
      }

      // 2. Prepare customer payload
      const newCustomerPayload: Partial<Customer> = {
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
        registered_capital: company.registered_capital || null,
        registered_name: company.name
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
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-8">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* Header Title & Live Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  คลังข้อมูลโรงงาน DBD (Leads Finder)
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                    จ.สมุทรปราการ
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  ค้นหาโรงงานอุตสาหกรรมที่จดทะเบียนถูกต้อง พร้อมพิกัดหมุด และดึงเข้าแผนที่เซลส์ในคลิกเดียว
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-slate-400">โรงงานใน จ.สมุทรปราการ</div>
              <div className="text-base sm:text-lg font-black text-slate-800">{stats.totalFactories.toLocaleString()} <span className="text-xs font-normal text-slate-400">แห่ง</span></div>
            </div>
            <div className="px-3 py-1.5 border-r border-slate-100">
              <div className="text-[11px] font-semibold text-emerald-600">มีพิกัดแผนที่แล้ว</div>
              <div className="text-base sm:text-lg font-black text-emerald-700">{stats.withPin.toLocaleString()} <span className="text-xs font-normal text-slate-400">หมุด</span></div>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-[11px] font-semibold text-blue-600">อยู่ใน Sales CRM</div>
              <div className="text-base sm:text-lg font-black text-blue-700">{stats.inCrm.toLocaleString()} <span className="text-xs font-normal text-slate-400">ราย</span></div>
            </div>
          </div>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 mb-6">
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
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="ALL">💰 ทุกขนาดทุนจดทะเบียน</option>
                <option value="1000000">ทุน ≥ 1 ล้านบาท</option>
                <option value="5000000">ทุน ≥ 5 ล้านบาท</option>
                <option value="10000000">ทุน ≥ 10 ล้านบาท</option>
                <option value="50000000">ทุน ≥ 50 ล้านบาท</option>
                <option value="100000000">ทุน ≥ 100 ล้านบาท</option>
              </select>
            </div>

            {/* 4. Map Pin & Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="ALL">🔍 ทุกสถานะ (มี/ไม่มีพิกัด)</option>
                <option value="HAS_PIN">📍 เฉพาะที่มีพิกัดหมุดแล้ว</option>
              </select>
            </div>
          </div>

          {/* Quick Active Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center space-x-2 text-slate-500">
              <span>พบทั้งหมด <strong className="text-slate-900">{totalCount.toLocaleString()}</strong> โรงงาน</span>
              {selectedDistrict !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                  อ.{selectedDistrict}
                </span>
              )}
            </div>

            <button
              onClick={() => {
                fetchCompanies();
                fetchExistingCustomers();
                fetchStats();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>รีเฟรชข้อมูล</span>
            </button>
          </div>
        </div>

        {/* Results List / Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">กำลังโหลดข้อมูลโรงงาน DBD...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold text-base">ไม่พบข้อมูลโรงงานตามเงื่อนไขที่ค้นหา</p>
              <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกอำเภออื่น</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">ชื่อโรงงาน / นิติบุคคล</th>
                      <th className="py-3 px-4">ที่ตั้ง / อำเภอ</th>
                      <th className="py-3 px-4 text-right">ทุนจดทะเบียน</th>
                      <th className="py-3 px-4">หมวดสินค้า / วัตถุประสงค์</th>
                      <th className="py-3 px-4 text-center">พิกัด & ช่องทางติดต่อ</th>
                      <th className="py-3 px-4 text-center">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {companies.map((c) => {
                      const inCrm = (c.tax_id && existingTaxIds.has(c.tax_id)) || existingDbdIds.has(c.id);
                      const customerId = (c.tax_id && existingTaxIds.get(c.tax_id)) || existingDbdIds.get(c.id);
                      const isImporting = importingId === c.id;
                      const isSuccess = importSuccessId === c.id;

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Company Name & Tax ID */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                            <div className="flex items-center space-x-2 mt-1">
                              {c.tax_id ? (
                                <a
                                  href={getDbdSearchUrl(c.tax_id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  <span>เลขทะเบียน: {c.tax_id}</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                <span className="text-slate-400 text-[11px]">ไม่ระบุเลขทะเบียน</span>
                              )}
                              {c.tsic_code && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                  TSIC {c.tsic_code}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              อ.{c.district || '-'} {c.subdistrict ? `ต.${c.subdistrict}` : ''}
                            </div>
                            <div className="text-slate-500 text-[11px] truncate max-w-xs" title={c.address || ''}>
                              {c.address || '-'}
                            </div>
                          </td>

                          {/* Capital */}
                          <td className="py-3.5 px-4 text-right">
                            {c.registered_capital ? (
                              <div>
                                <span className="font-black text-slate-900 text-sm">
                                  {(c.registered_capital / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-[10px] text-slate-500 ml-1">ล้านบาท</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Objective */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="line-clamp-2 text-slate-600 text-[11px]" title={c.objective || ''}>
                              {c.objective || c.industry_group || '-'}
                            </div>
                          </td>

                          {/* Pin & Contact */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {c.latitude && c.longitude ? (
                                <a
                                  href={c.google_maps_url || `https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                                  title={`ดูพิกัด Google Maps (${c.latitude.toFixed(4)}, ${c.longitude.toFixed(4)})`}
                                >
                                  <MapPin className="w-4 h-4" />
                                </a>
                              ) : (
                                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-400" title="กำลังรอประมวลผลพิกัด">
                                  <MapPin className="w-4 h-4" />
                                </span>
                              )}

                              {c.phone ? (
                                <a
                                  href={`tel:${c.phone}`}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
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
                                  className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                  title={c.website}
                                >
                                  <Globe className="w-4 h-4" />
                                </a>
                              ) : null}
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-3.5 px-4 text-center">
                            {inCrm ? (
                              <Link
                                href="/customers"
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>ใน CRM แล้ว</span>
                              </Link>
                            ) : (
                              <button
                                onClick={() => handleImportToCrm(c)}
                                disabled={isImporting}
                                className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                                  isSuccess
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:scale-102 active:scale-98'
                                }`}
                              >
                                {isImporting ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>กำลังบันทึก...</span>
                                  </>
                                ) : isSuccess ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>ดึงสำเร็จ!</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>ดึงเข้า Smart Map</span>
                                  </>
                                )}
                              </button>
                            )}
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

                  return (
                    <div key={c.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{c.name}</h3>
                          {c.tax_id && (
                            <a
                              href={getDbdSearchUrl(c.tax_id)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-[11px] text-blue-600 mt-0.5"
                            >
                              <span>เลขนิติบุคคล: {c.tax_id}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        {c.registered_capital && (
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-slate-900 text-sm">
                              {(c.registered_capital / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M
                            </span>
                            <span className="text-[10px] text-slate-400 block">บาท</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-500">
                        📍 อ.{c.district || '-'} {c.subdistrict ? `ต.${c.subdistrict}` : ''} ({c.address || '-'})
                      </div>

                      {c.objective && (
                        <div className="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg">
                          🏭 {c.objective}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center space-x-2">
                          {c.latitude && c.longitude && (
                            <a
                              href={c.google_maps_url || `https://www.google.com/maps?q=${c.latitude},${c.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center space-x-1"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>เปิดหมุด</span>
                            </a>
                          )}
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

                        {inCrm ? (
                          <Link
                            href="/customers"
                            className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center space-x-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>อยู่ใน CRM</span>
                          </Link>
                        ) : (
                          <button
                            onClick={() => handleImportToCrm(c)}
                            disabled={isImporting}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 text-white shadow-xs ${
                              isSuccess ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                          >
                            {isImporting ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isSuccess ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            <span>{isSuccess ? 'สำเร็จ' : 'ดึงเข้า Map'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  หน้า <strong className="text-slate-900">{currentPage}</strong> จากทั้งหมด{' '}
                  <strong className="text-slate-900">{totalPages || 1}</strong> หน้า ({totalCount.toLocaleString()} รายการ)
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold text-slate-800">
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
    </div>
  );
}
