'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Customer, PIPELINE_STAGES, getStageConfig } from '@/types/customer';
import { fetchAllCustomers, subscribeToRealtimeChanges, supabase } from '@/lib/supabase';
import {
  getMyPortfolioIds,
  addToPortfolio,
  removeFromPortfolio,
  togglePortfolio,
  subscribeToPortfolioChanges,
} from '@/lib/portfolio';
import CustomerDetailModal from '@/components/map/CustomerDetailModal';
import EmailComposeModal from '@/components/common/EmailComposeModal';
import { getDbdSearchUrl } from '@/lib/utils';
import Link from 'next/link';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Building,
  CheckCircle2,
  CalendarCheck,
  PhoneCall,
  Edit,
  LayoutGrid,
  List as ListIcon,
  Sparkles,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  X,
  Star,
  Globe,
  Loader2,
} from 'lucide-react';

export default function MyCustomersPage() {
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [portfolioIds, setPortfolioIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State inside My Portfolio
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State for Selected Customer Detail & Email
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [emailCustomer, setEmailCustomer] = useState<Customer | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // "+ ดึงลูกค้าจากฐานข้อมูล" Importer Modal State
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [importerSearch, setImporterSearch] = useState('');
  const [importerDistrict, setImporterDistrict] = useState('ALL');
  const [importerStage, setImporterStage] = useState('ALL');
  const [selectedToImport, setSelectedToImport] = useState<Set<number>>(new Set());

  // Load all customers from Supabase
  const loadData = async () => {
    try {
      const data = await fetchAllCustomers();
      if (data) setAllCustomers(data);
    } catch (e) {
      console.error('Error fetching customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setPortfolioIds(getMyPortfolioIds());

    const unsubPortfolio = subscribeToPortfolioChanges((ids) => {
      setPortfolioIds(ids);
    });

    const unsubRealtime = subscribeToRealtimeChanges(['customers'], () => {
      loadData();
    });

    return () => {
      unsubPortfolio();
      unsubRealtime();
    };
  }, []);

  // Filter customers that are currently in portfolio
  const portfolioCustomers = useMemo(() => {
    const pSet = new Set(portfolioIds);
    return allCustomers.filter((c) => pSet.has(c.id));
  }, [allCustomers, portfolioIds]);

  // Compute District lists
  const availableDistricts = useMemo(() => {
    const set = new Set<string>();
    portfolioCustomers.forEach((c) => {
      if (c.district) set.add(c.district);
    });
    return Array.from(set).sort();
  }, [portfolioCustomers]);

  const allDistricts = useMemo(() => {
    const set = new Set<string>();
    allCustomers.forEach((c) => {
      if (c.district) set.add(c.district);
    });
    return Array.from(set).sort();
  }, [allCustomers]);

  // Filtered Portfolio Customers for display
  const filteredCustomers = useMemo(() => {
    return portfolioCustomers.filter((c) => {
      if (selectedStage !== 'ALL' && c.pipeline_stage !== selectedStage) {
        return false;
      }
      if (selectedDistrict !== 'ALL' && c.district !== selectedDistrict) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchDistrict = c.district?.toLowerCase().includes(q);
        const matchContact = c.contact_person?.toLowerCase().includes(q);
        const matchProduct = c.target_product?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchDistrict && !matchContact && !matchProduct) {
          return false;
        }
      }
      return true;
    });
  }, [portfolioCustomers, selectedStage, selectedDistrict, searchQuery]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = portfolioCustomers.length;
    let uncontacted = 0;
    let inProgress = 0;
    let demo = 0;
    let won = 0;
    let withEmail = 0;

    portfolioCustomers.forEach((c) => {
      const st = c.pipeline_stage || 'ยังไม่ได้ติดต่อ';
      if (st === 'ยังไม่ได้ติดต่อ') uncontacted++;
      else if (st.includes('นัดหมาย') || st.includes('Demo')) demo++;
      else if (st.includes('สำเร็จ') || st.includes('ปิดการขาย')) won++;
      else inProgress++;

      if (c.email && c.email.trim()) withEmail++;
    });

    return { total, uncontacted, inProgress, demo, won, withEmail };
  }, [portfolioCustomers]);

  // Handle stage change directly from table/card
  const handleStageChange = async (customerId: number, newStage: string) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .update({
          pipeline_stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId)
        .select()
        .single();

      if (!error && data) {
        setAllCustomers((prev) =>
          prev.map((c) => (c.id === customerId ? (data as Customer) : c))
        );
      }
    } catch (e) {
      console.error('Failed to update stage:', e);
    }
  };

  // Importer filtered candidates
  const importerCandidates = useMemo(() => {
    const pSet = new Set(portfolioIds);
    return allCustomers.filter((c) => {
      if (importerDistrict !== 'ALL' && c.district !== importerDistrict) {
        return false;
      }
      if (importerStage !== 'ALL' && c.pipeline_stage !== importerStage) {
        return false;
      }
      if (importerSearch.trim()) {
        const q = importerSearch.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchPhone = c.phone?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchDistrict = c.district?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail && !matchDistrict) {
          return false;
        }
      }
      return true;
    });
  }, [allCustomers, portfolioIds, importerDistrict, importerStage, importerSearch]);

  // Bulk import action
  const handleBulkImport = () => {
    if (selectedToImport.size === 0) return;
    addToPortfolio(Array.from(selectedToImport));
    setSelectedToImport(new Set());
    setIsImporterOpen(false);
  };

  const handleToggleSelectToImport = (id: number) => {
    setSelectedToImport((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllImporter = () => {
    const unimported = importerCandidates.filter((c) => !portfolioIds.includes(c.id));
    if (selectedToImport.size === unimported.length) {
      setSelectedToImport(new Set());
    } else {
      setSelectedToImport(new Set(unimported.map((c) => c.id)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 sm:pb-8">
      <Navbar />

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-8 w-full flex-1 space-y-4 sm:space-y-6">
        
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#1b9b8e] via-teal-800 to-slate-900 text-white p-5 sm:p-8 shadow-lg shadow-teal-900/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-[11px] sm:text-xs font-semibold text-teal-200">
                <Users className="w-3.5 h-3.5 text-teal-300" />
                <span>My Customer Portfolio</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
                ลูกค้าของฉัน (พอร์ตโฟลิโอ)
              </h1>
              <p className="text-xs sm:text-sm text-teal-100/90 max-w-xl leading-relaxed">
                โรงงานที่คุณเลือกดึงมาดูแลเพื่อโฟกัสงานขาย ติดตามสถานะ และวางแผนเข้าพบลูกค้า
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsImporterOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white text-[#148277] font-bold text-xs sm:text-sm shadow-md hover:bg-teal-50 transition-all touch-press active:scale-95"
              >
                <Plus className="w-4 h-4 text-[#1b9b8e]" />
                <span>+ ดึงลูกค้าเข้าพอร์ต</span>
              </button>

              <Link
                href="/map?portfolio=true"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs sm:text-sm shadow-sm backdrop-blur transition-all touch-press"
              >
                <MapPin className="w-4 h-4 text-teal-200" />
                <span>ดูบนแผนที่</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">ในพอร์ตทั้งหมด</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-[#148277] flex items-center justify-center">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-slate-900">
              {loading ? '...' : stats.total}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block">โรงงานที่เลือกดูแล</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">ยังไม่ได้ติดต่อ</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
                <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-slate-700">
              {loading ? '...' : stats.uncontacted}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block">รอโทรเปิดงาน</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">นัดหมาย Demo</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-50 text-[#148277] flex items-center justify-center">
                <CalendarCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-[#1b9b8e]">
              {loading ? '...' : stats.demo}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block">นัดสาธิตเครื่อง</span>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">ปิดการขายสำเร็จ</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-3xl font-black text-emerald-600">
              {loading ? '...' : stats.won}
            </div>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block">ลูกค้าซื้อเครื่องแล้ว</span>
          </div>
        </div>

        {/* Filter & Action Controls Bar */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อโรงงาน, เบอร์, อีเมล, ผู้ติดต่อ, สินค้า..."
              className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b9b8e] focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters & View Mode */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            
            {/* Stage Filter */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
            >
              <option value="ALL">ทุกสถานะ Pipeline</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.stage} value={s.stage}>
                  {s.stage}
                </option>
              ))}
            </select>

            {/* District Filter */}
            {availableDistricts.length > 0 && (
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none cursor-pointer"
              >
                <option value="ALL">ทุกอำเภอ ({availableDistricts.length})</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#148277] shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="มุมมองการ์ด (Grid View)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#148277] shadow-xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="มุมมองตาราง (Table View)"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>

        {/* Portfolio Content List */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1b9b8e] mx-auto" />
            <p className="text-sm font-semibold text-slate-600">กำลังโหลดลูกค้าในพอร์ตโฟลิโอของคุณ...</p>
          </div>
        ) : portfolioCustomers.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-14 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-[#1b9b8e] flex items-center justify-center mx-auto shadow-sm">
              <Users className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                ยังไม่มีลูกค้าในพอร์ตของคุณ
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                คุณสามารถกดปุ่มด้านล่างเพื่อเลือกดึงโรงงานจากฐานข้อมูลกลาง (1,089 แห่ง) หรือกดติดดาว ⭐ จากบนแผนที่
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setIsImporterOpen(true)}
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs sm:text-sm shadow-sm transition-all touch-press active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ ดึงลูกค้าจากฐานข้อมูลเข้าพอร์ต</span>
              </button>
              <Link
                href="/map"
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all touch-press"
              >
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>เลือกจากแผนที่</span>
              </Link>
            </div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          /* Search Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">ไม่พบลูกค้าตามเงื่อนไขที่ค้นหา</p>
            <p className="text-xs text-slate-400">ลองล้างคำค้นหาหรือตัวกรอง</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredCustomers.map((cust) => {
              const stageConf = getStageConfig(cust.pipeline_stage);

              return (
                <div
                  key={cust.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-teal-200 transition-all p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Top Row: Stage & Remove */}
                    <div className="flex items-center justify-between gap-1">
                      <select
                        value={cust.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
                        onChange={(e) => handleStageChange(cust.id, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s.stage} value={s.stage}>
                            {s.stage}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => removeFromPortfolio(cust.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="นำออกจากพอร์ตของฉัน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Customer Name */}
                    <h3
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setIsDetailModalOpen(true);
                      }}
                      className="font-bold text-sm text-slate-900 hover:text-[#148277] cursor-pointer leading-snug line-clamp-2"
                    >
                      {cust.name}
                    </h3>

                    {/* Location & Details */}
                    <div className="space-y-1 text-xs text-slate-600">
                      <p className="flex items-center space-x-1.5 truncate text-[11px] text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{cust.district || cust.address || 'สมุทรปราการ'}</span>
                      </p>

                      {cust.contact_person && (
                        <p className="flex items-center space-x-1.5 truncate text-[11px]">
                          <span className="text-slate-400">👤</span>
                          <span className="font-semibold text-slate-700 truncate">{cust.contact_person}</span>
                        </p>
                      )}

                      {cust.target_product && (
                        <p className="text-[11px] bg-slate-50 p-1.5 rounded-lg text-slate-600 border border-slate-100 truncate">
                          🎯 {cust.target_product}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                    {cust.phone ? (
                      <a
                        href={`tel:${cust.phone.replace(/\s+/g, '')}`}
                        className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] transition-colors"
                        title={`โทร ${cust.phone}`}
                      >
                        <Phone className="w-3.5 h-3.5 mb-0.5 text-emerald-600" />
                        <span>โทร</span>
                      </a>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-slate-50 text-slate-300 text-[10px]">
                        <Phone className="w-3.5 h-3.5 mb-0.5" />
                        <span>ไม่มีเบอร์</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEmailCustomer(cust);
                        setIsEmailModalOpen(true);
                      }}
                      className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl font-bold text-[10px] transition-colors ${
                        cust.email
                          ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-500'
                      }`}
                      title={cust.email ? `ส่งอีเมลถึง ${cust.email}` : 'เขียนอีเมล'}
                    >
                      <Mail className={`w-3.5 h-3.5 mb-0.5 ${cust.email ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span>{cust.email ? 'ส่งเมล' : 'เขียนเมล'}</span>
                    </button>

                    <a
                      href={
                        cust.google_maps_url ||
                        (cust.latitude && cust.longitude
                          ? `https://www.google.com/maps?q=${cust.latitude},${cust.longitude}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cust.name)}`)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#148277] font-bold text-[10px] transition-colors"
                      title="เปิด Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5 mb-0.5 text-[#1b9b8e]" />
                      <span>แผนที่</span>
                    </a>

                    <button
                      onClick={() => {
                        setSelectedCustomer(cust);
                        setIsDetailModalOpen(true);
                      }}
                      className="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-[10px] transition-colors active:scale-95"
                      title="ดูรายละเอียด & บันทึกข้อมูล"
                    >
                      <Edit className="w-3.5 h-3.5 mb-0.5" />
                      <span>จัดการ</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ชื่อโรงงาน</th>
                    <th className="py-3 px-3">อำเภอ/โซน</th>
                    <th className="py-3 px-3">สถานะ Sales Pipeline</th>
                    <th className="py-3 px-3">ผู้ติดต่อ / สินค้าเป้าหมาย</th>
                    <th className="py-3 px-3">เบอร์โทร & อีเมล</th>
                    <th className="py-3 px-4 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => {
                    const stageConf = getStageConfig(cust.pipeline_stage);

                    return (
                      <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 max-w-[220px]">
                          <div
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsDetailModalOpen(true);
                            }}
                            className="cursor-pointer hover:text-[#148277] truncate"
                          >
                            {cust.name}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {cust.district || 'สมุทรปราการ'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={cust.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
                            onChange={(e) => handleStageChange(cust.id, e.target.value)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}
                          >
                            {PIPELINE_STAGES.map((s) => (
                              <option key={s.stage} value={s.stage}>
                                {s.stage}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-3 max-w-[180px]">
                          <div className="truncate text-slate-700 font-medium">
                            {cust.contact_person ? `👤 ${cust.contact_person}` : '-'}
                          </div>
                          {cust.target_product && (
                            <div className="text-[10px] text-slate-400 truncate">
                              🎯 {cust.target_product}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap space-y-0.5">
                          {cust.phone ? (
                            <a href={`tel:${cust.phone.replace(/\s+/g, '')}`} className="text-emerald-700 font-semibold hover:underline block">
                              📞 {cust.phone}
                            </a>
                          ) : (
                            <span className="text-slate-300 block">ไม่มีเบอร์</span>
                          )}
                          {cust.email && (
                            <button
                              onClick={() => {
                                setEmailCustomer(cust);
                                setIsEmailModalOpen(true);
                              }}
                              className="text-indigo-600 hover:underline block text-[11px] truncate max-w-[140px]"
                            >
                              ✉️ {cust.email}
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedCustomer(cust);
                              setIsDetailModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-xs"
                          >
                            จัดการ
                          </button>
                          <button
                            onClick={() => removeFromPortfolio(cust.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="นำออกจากพอร์ต"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* "+ ดึงลูกค้าจากฐานข้อมูล" Importer Modal */}
      {isImporterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base sm:text-xl font-bold text-slate-900">
                    ดึงโรงงานจากฐานข้อมูลเข้าพอร์ต
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-[#148277] text-xs font-bold">
                    {allCustomers.length} โรงงานทั้งหมด
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  เลือกโรงงานที่ต้องการดึงเข้ามาดูแลในพอร์ตของคุณ (สามารถเลือกหลายโรงงานพร้อมกันได้)
                </p>
              </div>

              <button
                onClick={() => setIsImporterOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Search & Filters */}
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={importerSearch}
                  onChange={(e) => setImporterSearch(e.target.value)}
                  placeholder="ค้นหาชื่อโรงงาน, เบอร์, อำเภอ..."
                  className="w-full pl-9 pr-4 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b9b8e] focus:bg-white"
                />
              </div>

              <select
                value={importerDistrict}
                onChange={(e) => setImporterDistrict(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none w-full sm:w-auto"
              >
                <option value="ALL">ทุกอำเภอ ({allDistricts.length})</option>
                {allDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={importerStage}
                onChange={(e) => setImporterStage(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 outline-none w-full sm:w-auto"
              >
                <option value="ALL">ทุกสถานะ</option>
                {PIPELINE_STAGES.map((s) => (
                  <option key={s.stage} value={s.stage}>
                    {s.stage}
                  </option>
                ))}
              </select>
            </div>

            {/* Candidates List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-4">
              <div className="flex items-center justify-between pb-2 px-2 text-xs font-semibold text-slate-500">
                <button
                  onClick={handleSelectAllImporter}
                  className="flex items-center space-x-1.5 text-[#148277] hover:underline"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>เลือก/ยกเลิก ทั้งหมดที่ยังไม่อยู่ในพอร์ต</span>
                </button>
                <span>พบ {importerCandidates.length} รายการ</span>
              </div>

              {importerCandidates.map((cust) => {
                const inPortfolio = portfolioIds.includes(cust.id);
                const isSelected = selectedToImport.has(cust.id);
                const stageConf = getStageConfig(cust.pipeline_stage);

                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      if (!inPortfolio) handleToggleSelectToImport(cust.id);
                    }}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                      inPortfolio
                        ? 'bg-slate-50/80 opacity-60'
                        : isSelected
                        ? 'bg-teal-50/80 border border-teal-200 cursor-pointer'
                        : 'hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {!inPortfolio && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectToImport(cust.id)}
                          className="w-4 h-4 text-[#1b9b8e] rounded border-slate-300 focus:ring-[#1b9b8e] cursor-pointer"
                        />
                      )}

                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}>
                            {cust.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            📍 {cust.district || cust.address || 'สมุทรปราการ'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {cust.name}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-3">
                          {cust.phone && <span>📞 {cust.phone}</span>}
                          {cust.email && <span className="text-indigo-600 truncate">✉️ {cust.email}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {inPortfolio ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-600">
                          ✓ อยู่ในพอร์ตแล้ว
                        </span>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToPortfolio(cust.id);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-xs touch-press active:scale-95"
                        >
                          + ดึงเข้าพอร์ต
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer with Bulk Action */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                เลือกแล้ว: <b>{selectedToImport.size}</b> รายการ
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsImporterOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl"
                >
                  ปิด
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={selectedToImport.size === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#1b9b8e] hover:bg-[#148277] text-white font-bold text-xs shadow-md disabled:opacity-40 transition-all touch-press active:scale-95"
                >
                  ดึงเข้าพอร์ตพร้อมกัน ({selectedToImport.size})
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Customer Detail & Edit Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
        }}
        onCustomerUpdated={(updated) => {
          setAllCustomers((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c))
          );
          setSelectedCustomer(updated);
        }}
        onCustomerDeleted={(deletedId) => {
          setAllCustomers((prev) => prev.filter((c) => c.id !== deletedId));
          removeFromPortfolio(deletedId);
          setIsDetailModalOpen(false);
          setSelectedCustomer(null);
        }}
      />

      {/* Email Compose Modal */}
      <EmailComposeModal
        isOpen={isEmailModalOpen}
        customer={emailCustomer}
        onClose={() => {
          setIsEmailModalOpen(false);
          setEmailCustomer(null);
        }}
        onEmailSent={() => {
          loadData();
        }}
      />
    </div>
  );
}
