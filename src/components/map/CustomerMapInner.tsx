'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Customer, DBDCompany, PIPELINE_STAGES, getStageConfig } from '@/types/customer';
import { fetchAllCustomers, subscribeToRealtimeChanges } from '@/lib/supabase';
import CustomerDetailModal from './CustomerDetailModal';
import DbdCompanyDetailModal from './DbdCompanyDetailModal';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import EmailComposeModal from '@/components/common/EmailComposeModal';
import { generateDistrictZones, DistrictZone } from '@/lib/geo';
import { getDbdSearchUrl, getGoogleDbdSearchUrl, getCleanCompanyName } from '@/lib/utils';
import Supercluster from 'supercluster';
import {
  Search,
  Filter,
  MapPin,
  Phone,
  ExternalLink,
  ChevronRight,
  List,
  Layers,
  Crosshair,
  RotateCcw,
  Star,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  Compass,
  Plus,
  Eye,
  EyeOff,
  Building,
  Building2,
  Mail,
  Edit,
  Sparkles,
  Globe,
  Coins
} from 'lucide-react';

interface CustomerMapInnerProps {
  initialCustomers: Customer[];
  initialDbdCompanies?: DBDCompany[];
}

// Function to generate sleek minimal SVG Pin icon for CRM customer
function createSinglePin(customer: Customer, isSelected: boolean = false) {
  const stage = customer.pipeline_stage || '';
  const hasContact =
    (customer.activities_count !== undefined && customer.activities_count > 0) ||
    (stage && stage !== 'ยังไม่ได้ติดต่อ');

  let pinColor = '#94a3b8'; // default uncontacted: subtle slate-400
  let isContacted = false;

  if (hasContact) {
    isContacted = true;
    if (stage.includes('ติดต่อแล้ว') || stage.includes('ติดตามงาน')) pinColor = '#f59e0b'; // vibrant amber
    else if (stage.includes('นัดหมาย') || stage.includes('Demo')) pinColor = '#2563eb'; // blue
    else if (stage.includes('เสนอราคา')) pinColor = '#7c3aed'; // purple
    else if (stage.includes('สำเร็จ') || stage.includes('ปิดการขาย (สำเร็จ)')) pinColor = '#059669'; // emerald
    else if (stage.includes('ไม่สนใจ') || stage.includes('ไม่ได้')) pinColor = '#e11d48'; // rose
    else pinColor = '#f59e0b'; // default contacted
  }

  if (isSelected) {
    return `
      <div style="position: relative; width: 48px; height: 58px; display: flex; align-items: flex-end; justify-content: center; cursor: pointer; z-index: 99999;">
        <!-- Radar Pulse Waves -->
        <div class="radar-ring"></div>
        <div class="radar-ring-2"></div>

        <!-- Floating Name Tag Badge -->
        <div style="
          position: absolute;
          bottom: 62px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          border: 1.5px solid ${isContacted ? '#10b981' : '#3b82f6'};
          display: flex;
          align-items: center;
          gap: 5px;
          pointer-events: none;
        ">
          <span>${isContacted ? '✅' : '🧑‍💼'}</span>
          <span>${customer.name}</span>
          ${customer.activities_count ? `<span style="background: #10b981; color: white; border-radius: 9999px; padding: 1px 5px; font-size: 9px; font-weight: 800;">${customer.activities_count} ครั้ง</span>` : ''}
        </div>

        <!-- Large Selected Pin -->
        <svg width="44" height="54" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="${isContacted ? '#10b981' : '#3b82f6'}"/>
          <path d="M16 2C8.268 2 2 8.268 2 16c0 10.5 14 21 14 21s14-10.5 14-21c0-7.732-6.268-14-14-14z" fill="${pinColor}"/>
          <circle cx="16" cy="15" r="7" fill="#ffffff"/>
          <circle cx="16" cy="15" r="4" fill="${isContacted ? '#10b981' : '#3b82f6'}"/>
        </svg>
      </div>
    `;
  }

  if (isContacted) {
    const countBadge = customer.activities_count && customer.activities_count > 1 ? customer.activities_count : '✓';
    return `
      <div style="position: relative; width: 30px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg width="28" height="34" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); transition: transform 0.15s ease;">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 19 13 19s13-9.25 13-19c0-7.18-5.82-13-13-13z" fill="${pinColor}"/>
          <path d="M13 1.5C6.65 1.5 1.5 6.65 1.5 13c0 8.5 11.5 17 11.5 17s11.5-8.5 11.5-17c0-6.35-5.15-11.5-11.5-11.5z" stroke="#ffffff" stroke-width="1.2"/>
          <circle cx="13" cy="12" r="5" fill="#ffffff"/>
          <circle cx="13" cy="12" r="3" fill="${pinColor}"/>
        </svg>
        <div style="
          position: absolute;
          top: -3px;
          right: -3px;
          min-width: 15px;
          height: 15px;
          padding: 0 2px;
          border-radius: 9999px;
          background: #10b981;
          color: #ffffff;
          font-size: 9px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #ffffff;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        ">
          ${countBadge}
        </div>
      </div>
    `;
  }

  // Uncontacted CRM Pin
  return `
    <div style="position: relative; width: 24px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.88;">
      <svg width="22" height="28" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1.5px 3px rgba(0,0,0,0.25)); transition: transform 0.15s ease;">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 19 13 19s13-9.25 13-19c0-7.18-5.82-13-13-13z" fill="#64748b"/>
        <circle cx="13" cy="12" r="4.5" fill="#ffffff"/>
      </svg>
    </div>
  `;
}

// Function to generate distinct DBD Factory Pin (Amber/Orange with factory badge)
function createDbdSinglePin(company: DBDCompany, isSelected: boolean = false, isInCrm: boolean = false) {
  const isGoogle = company.pin_type === 'GOOGLE_BUSINESS';
  const pinColor = isGoogle ? '#f97316' : '#d97706'; // vivid orange vs amber-600

  let capitalStr = '';
  if (company.registered_capital) {
    if (company.registered_capital >= 1_000_000) {
      capitalStr = `${(company.registered_capital / 1_000_000).toFixed(0)} ลบ.`;
    } else {
      capitalStr = `${(company.registered_capital / 1_000).toFixed(0)}k`;
    }
  }

  if (isSelected) {
    return `
      <div style="position: relative; width: 48px; height: 58px; display: flex; align-items: flex-end; justify-content: center; cursor: pointer; z-index: 99999;">
        <!-- Amber Radar Wave -->
        <div class="radar-ring" style="border-color: #f59e0b; background: rgba(245, 158, 11, 0.25);"></div>
        <div class="radar-ring-2" style="border-color: #d97706; background: rgba(217, 119, 6, 0.15);"></div>

        <!-- Floating Tag Badge -->
        <div style="
          position: absolute;
          bottom: 62px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #ffffff;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 14px rgba(0,0,0,0.35);
          border: 1.5px solid ${isGoogle ? '#10b981' : '#f59e0b'};
          display: flex;
          align-items: center;
          gap: 5px;
          pointer-events: none;
        ">
          <span>${isGoogle ? '🟢' : '🏭'}</span>
          <span>${company.name}</span>
          ${capitalStr ? `<span style="background: #f59e0b; color: #0f172a; border-radius: 9999px; padding: 1px 6px; font-size: 9px; font-weight: 800;">${capitalStr}</span>` : ''}
          ${isInCrm ? `<span style="background: #3b82f6; color: white; border-radius: 9999px; padding: 1px 5px; font-size: 9px; font-weight: 800;">อยู่ใน CRM</span>` : ''}
        </div>

        <svg width="44" height="54" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="#f59e0b"/>
          <path d="M16 2C8.268 2 2 8.268 2 16c0 10.5 14 21 14 21s14-10.5 14-21c0-7.732-6.268-14-14-14z" fill="${pinColor}"/>
          <circle cx="16" cy="15" r="7" fill="#ffffff"/>
          <circle cx="16" cy="15" r="4" fill="#f59e0b"/>
        </svg>
      </div>
    `;
  }

  // Regular DBD Pin
  return `
    <div style="position: relative; width: 28px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <svg width="26" height="32" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.35)); transition: transform 0.15s ease;">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 19 13 19s13-9.25 13-19c0-7.18-5.82-13-13-13z" fill="${pinColor}"/>
        <path d="M13 1.5C6.65 1.5 1.5 6.65 1.5 13c0 8.5 11.5 17 11.5 17s11.5-8.5 11.5-17c0-6.35-5.15-11.5-11.5-11.5z" stroke="#ffffff" stroke-width="1"/>
        <circle cx="13" cy="12" r="4.5" fill="#ffffff"/>
      </svg>
      
      <!-- Top Badge (Google vs DBD Address vs in-crm) -->
      <div style="
        position: absolute;
        top: -3px;
        right: -3px;
        min-width: 14px;
        height: 14px;
        padding: 0 2px;
        border-radius: 9999px;
        background: ${isInCrm ? '#3b82f6' : (isGoogle ? '#10b981' : '#f59e0b')};
        color: #ffffff;
        font-size: 8px;
        font-weight: 900;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      ">
        ${isInCrm ? '✓' : (isGoogle ? 'G' : 'D')}
      </div>
    </div>
  `;
}

// Function to generate clean Cluster bubble
function createClusterIcon(count: number) {
  let size = 36;
  let bgGradient = 'linear-gradient(135deg, #2563eb, #1e40af)';
  let shadow = 'rgba(37, 99, 235, 0.4)';

  if (count >= 100) {
    size = 48;
    bgGradient = 'linear-gradient(135deg, #6366f1, #4338ca)';
    shadow = 'rgba(99, 102, 241, 0.5)';
  } else if (count >= 30) {
    size = 42;
    bgGradient = 'linear-gradient(135deg, #0284c7, #0369a1)';
    shadow = 'rgba(2, 132, 199, 0.45)';
  }

  return `
    <div style="
      width: ${size}px;
      height: ${size}px;
      background: ${bgGradient};
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 12px ${shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: ${count >= 100 ? '13px' : '12px'};
      font-family: inherit;
      cursor: pointer;
      transition: transform 0.15s ease;
    ">
      ${count}
    </div>
  `;
}

// Function to create Zone Label Tag at the center of a district
function createZoneLabelIcon(name: string, count: number, color: string) {
  return `
    <div style="
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(4px);
      border: 1.5px solid ${color};
      border-radius: 20px;
      padding: 3px 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 5px;
      pointer-events: auto;
      cursor: pointer;
    ">
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
      <span>โซน${name}</span>
      <span style="background: #f1f5f9; color: ${color}; font-size: 10px; padding: 1px 5px; border-radius: 10px; font-weight: 800;">${count}</span>
    </div>
  `;
}

export default function CustomerMapInner({
  initialCustomers,
  initialDbdCompanies = [],
}: CustomerMapInnerProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [dbdCompanies, setDbdCompanies] = useState<DBDCompany[]>(initialDbdCompanies);

  // Layer Toggles
  const [showCrmLayer, setShowCrmLayer] = useState(true);
  const [showDbdLayer, setShowDbdLayer] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [contactFilter, setContactFilter] = useState<'ALL' | 'CONTACTED' | 'UNCONTACTED'>('ALL');
  const [dbdPinFilter, setDbdPinFilter] = useState<'ALL' | 'GOOGLE_BUSINESS' | 'DBD_ADDRESS'>('ALL');
  const [showZones, setShowZones] = useState(true);

  // Drawer & Tab Selection
  const [showDrawer, setShowDrawer] = useState(true);
  const [drawerTab, setDrawerTab] = useState<'CRM' | 'DBD'>('CRM');

  // Selected entities & modals
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDbdCompany, setSelectedDbdCompany] = useState<DBDCompany | null>(null);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDbdModalOpen, setIsDbdModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailCustomer, setEmailCustomer] = useState<Customer | null>(null);

  // Map DOM and Leaflet instance references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const selectedMarkerLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const superclusterRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  // Cross-reference Maps for fast duplicate / in-CRM checking
  const existingTaxIds = useMemo(() => {
    const map = new Map<string, number>();
    customers.forEach((c) => {
      if (c.tax_id) map.set(c.tax_id.trim(), c.id);
    });
    return map;
  }, [customers]);

  const existingDbdIds = useMemo(() => {
    const map = new Map<number, number>();
    customers.forEach((c) => {
      if (c.dbd_company_id) map.set(c.dbd_company_id, c.id);
    });
    return map;
  }, [customers]);

  // Realtime subscription for CRM changes
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeChanges(['customers', 'customer_activities'], async () => {
      try {
        const fresh = await fetchAllCustomers();
        if (fresh && fresh.length > 0) {
          setCustomers(fresh);
          setSelectedCustomer((curr) => {
            if (!curr) return null;
            const updated = fresh.find((c) => c.id === curr.id);
            return updated || curr;
          });
        }
      } catch (err) {
        console.error('Error syncing realtime customers on map:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Summary counts of CRM contacted vs uncontacted
  const statsSummary = useMemo(() => {
    let contacted = 0;
    let uncontacted = 0;
    customers.forEach((c) => {
      const hasContact =
        (c.activities_count !== undefined && c.activities_count > 0) ||
        (c.pipeline_stage && c.pipeline_stage !== 'ยังไม่ได้ติดต่อ');
      if (hasContact) contacted++;
      else uncontacted++;
    });
    return { contacted, uncontacted, total: customers.length };
  }, [customers]);

  // Summary stats for DBD
  const dbdStatsSummary = useMemo(() => {
    let googleCount = 0;
    let addressCount = 0;
    dbdCompanies.forEach((d) => {
      if (d.pin_type === 'GOOGLE_BUSINESS') googleCount++;
      else addressCount++;
    });
    return { total: dbdCompanies.length, googleCount, addressCount };
  }, [dbdCompanies]);

  // Generate District Zones automatically from customer points
  const districtZones = useMemo(() => {
    return generateDistrictZones(customers, 5);
  }, [customers]);

  // Extract unique districts combining both CRM and DBD
  const districts = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.district && c.district.trim()) set.add(c.district.trim());
    });
    dbdCompanies.forEach((d) => {
      if (d.district && d.district.trim()) set.add(d.district.trim());
    });
    return Array.from(set).sort();
  }, [customers, dbdCompanies]);

  // Filtered CRM customer list
  const filteredCustomers = useMemo(() => {
    if (!showCrmLayer) return [];
    return customers.filter((c) => {
      if (!c.latitude || !c.longitude) return false;
      if (selectedDistrict !== 'ALL' && c.district !== selectedDistrict) return false;
      if (selectedStage !== 'ALL' && c.pipeline_stage !== selectedStage) return false;

      // Contact Status Filter
      const hasContact =
        (c.activities_count !== undefined && c.activities_count > 0) ||
        (c.pipeline_stage && c.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

      if (contactFilter === 'CONTACTED' && !hasContact) return false;
      if (contactFilter === 'UNCONTACTED' && hasContact) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone && c.phone.toLowerCase().includes(q);
        const matchProduct = c.target_product && c.target_product.toLowerCase().includes(q);
        const matchAddress = c.address && c.address.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchProduct && !matchAddress) return false;
      }
      return true;
    });
  }, [customers, showCrmLayer, selectedDistrict, selectedStage, contactFilter, searchQuery]);

  // Filtered DBD companies list
  const filteredDbdCompanies = useMemo(() => {
    if (!showDbdLayer) return [];
    return dbdCompanies.filter((d) => {
      if (!d.latitude || !d.longitude) return false;
      if (selectedDistrict !== 'ALL' && d.district !== selectedDistrict) return false;

      if (dbdPinFilter === 'GOOGLE_BUSINESS' && d.pin_type !== 'GOOGLE_BUSINESS') return false;
      if (dbdPinFilter === 'DBD_ADDRESS' && d.pin_type === 'GOOGLE_BUSINESS') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchTax = d.tax_id && d.tax_id.toLowerCase().includes(q);
        const matchObj = d.objective && d.objective.toLowerCase().includes(q);
        const matchAddr = d.address && d.address.toLowerCase().includes(q);
        if (!matchName && !matchTax && !matchObj && !matchAddr) return false;
      }
      return true;
    });
  }, [dbdCompanies, showDbdLayer, selectedDistrict, dbdPinFilter, searchQuery]);

  // Fly to Customer
  const flyToCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedDbdCompany(null);
    if (mapInstanceRef.current && customer.latitude && customer.longitude) {
      mapInstanceRef.current.flyTo([customer.latitude, customer.longitude], 16, {
        duration: 0.8,
      });
    }
  }, []);

  // Fly to DBD Company
  const flyToDbdCompany = useCallback((company: DBDCompany) => {
    setSelectedDbdCompany(company);
    setSelectedCustomer(null);
    if (mapInstanceRef.current && company.latitude && company.longitude) {
      mapInstanceRef.current.flyTo([company.latitude, company.longitude], 16, {
        duration: 0.8,
      });
    }
  }, []);

  // Build Supercluster index combining both active layers
  useEffect(() => {
    const points: any[] = [];

    // 1. Add CRM customers
    if (showCrmLayer) {
      filteredCustomers.forEach((c) => {
        points.push({
          type: 'Feature' as const,
          properties: {
            cluster: false,
            isDbd: false,
            customer: c,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [c.longitude!, c.latitude!],
          },
        });
      });
    }

    // 2. Add DBD companies
    if (showDbdLayer) {
      filteredDbdCompanies.forEach((d) => {
        const inCrm = (d.tax_id && existingTaxIds.has(d.tax_id)) || existingDbdIds.has(d.id);
        const crmId = d.tax_id ? existingTaxIds.get(d.tax_id) : (existingDbdIds.get(d.id) || null);

        points.push({
          type: 'Feature' as const,
          properties: {
            cluster: false,
            isDbd: true,
            dbdCompany: d,
            isInCrm: inCrm,
            crmCustomerId: crmId,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [d.longitude!, d.latitude!],
          },
        });
      });
    }

    const index = new Supercluster({
      radius: 60,
      maxZoom: 17,
      minPoints: 2,
    });

    index.load(points);
    superclusterRef.current = index;
    renderClusteredMarkers();
  }, [filteredCustomers, filteredDbdCompanies, showCrmLayer, showDbdLayer, existingTaxIds, existingDbdIds]);

  // Render clusters and single markers based on current map bounds & zoom
  const renderClusteredMarkers = useCallback(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !superclusterRef.current) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default || leaflet;
      const map = mapInstanceRef.current;
      const markersGroup = markersLayerRef.current;
      markersGroup.clearLayers();

      const bounds = map.getBounds();
      const zoom = Math.floor(map.getZoom());

      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];

      const clusters = superclusterRef.current.getClusters(bbox, zoom);

      clusters.forEach((feature: any) => {
        const [lng, lat] = feature.geometry.coordinates;
        const isCluster = feature.properties.cluster;

        if (isCluster) {
          const count = feature.properties.point_count;
          const clusterId = feature.properties.cluster_id;

          let cSize = 36;
          if (count >= 100) cSize = 48;
          else if (count >= 30) cSize = 42;

          const clusterIcon = L.divIcon({
            className: 'custom-marker-icon',
            html: createClusterIcon(count),
            iconSize: [cSize, cSize],
            iconAnchor: [cSize / 2, cSize / 2],
          });

          const marker = L.marker([lat, lng], { icon: clusterIcon });

          marker.on('click', () => {
            const currentZoom = map.getZoom();
            const expansionZoom = superclusterRef.current.getClusterExpansionZoom(clusterId);

            if (currentZoom >= 16 || expansionZoom > 17) {
              const leaves = superclusterRef.current.getLeaves(clusterId, 30);
              let leavesHtml = `
                <div style="font-family: inherit; min-width: 250px; max-width: 300px; max-height: 270px; overflow-y: auto; padding: 2px;">
                  <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                    🏭 รวม ${leaves.length} โรงงานในจุดนี้
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
              `;

              leaves.forEach((l: any, idx: number) => {
                if (l.properties.isDbd) {
                  const d: DBDCompany = l.properties.dbdCompany;
                  const inCrm = l.properties.isInCrm;
                  leavesHtml += `
                    <div id="leaf-select-dbd-${d.id}" style="padding: 6px 8px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; cursor: pointer; transition: background 0.15s ease;">
                      <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                        <span style="font-size: 12px; font-weight: 700; color: #92400e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">🏢 ${d.name}</span>
                        ${inCrm ? `<span style="font-size: 9px; font-weight: 800; background: #3b82f6; color: white; border-radius: 4px; padding: 1px 4px;">CRM</span>` : ''}
                      </div>
                      <div style="font-size: 11px; color: #b45309; margin-top: 2px;">💰 ทุน ${d.registered_capital ? (d.registered_capital / 1000000).toFixed(0) + ' ลบ.' : '-'} • ${d.pin_type === 'GOOGLE_BUSINESS' ? '🟢 Google' : '📍 DBD'}</div>
                    </div>
                  `;
                } else {
                  const c: Customer = l.properties.customer;
                  leavesHtml += `
                    <div id="leaf-select-crm-${c.id}" style="padding: 6px 8px; border-radius: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; cursor: pointer; transition: background 0.15s ease;">
                      <div style="font-size: 12px; font-weight: 700; color: #166534;">🧑‍💼 #${c.seq || c.id} ${c.name}</div>
                      <div style="font-size: 11px; color: #15803d; margin-top: 2px;">📞 ${c.phone || '-'} • <span style="font-weight: 600;">${c.pipeline_stage || 'ยังไม่ได้ติดต่อ'}</span></div>
                    </div>
                  `;
                }
              });
              leavesHtml += `</div></div>`;

              L.popup().setLatLng([lat, lng]).setContent(leavesHtml).openOn(map);

              setTimeout(() => {
                leaves.forEach((l: any) => {
                  if (l.properties.isDbd) {
                    const d: DBDCompany = l.properties.dbdCompany;
                    const el = document.getElementById(`leaf-select-dbd-${d.id}`);
                    if (el) {
                      el.onclick = () => {
                        map.closePopup();
                        flyToDbdCompany(d);
                      };
                    }
                  } else {
                    const c: Customer = l.properties.customer;
                    const el = document.getElementById(`leaf-select-crm-${c.id}`);
                    if (el) {
                      el.onclick = () => {
                        map.closePopup();
                        flyToCustomer(c);
                      };
                    }
                  }
                });
              }, 100);
            } else {
              map.flyTo([lat, lng], Math.min(expansionZoom, 17), { duration: 0.8 });
            }
          });

          markersGroup.addLayer(marker);
        } else {
          // SINGLE PIN (DBD vs CRM)
          const isDbd = feature.properties.isDbd;

          if (isDbd) {
            const dbd: DBDCompany = feature.properties.dbdCompany;
            const isInCrm = feature.properties.isInCrm;

            // Skip if currently selected
            if (selectedDbdCompany && dbd.id === selectedDbdCompany.id) return;

            const customIcon = L.divIcon({
              className: 'custom-marker-icon',
              html: createDbdSinglePin(dbd, false, isInCrm),
              iconSize: [28, 34],
              iconAnchor: [14, 34],
              popupAnchor: [0, -32],
            });

            const marker = L.marker([lat, lng], { icon: customIcon });

            const isGoogle = dbd.pin_type === 'GOOGLE_BUSINESS';
            const popupContent = `
              <div style="font-family: inherit; min-width: 240px; max-width: 300px; padding: 2px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
                  <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
                    🏢 คลังโรงงาน DBD
                  </span>
                  <span style="font-size: 10px; font-weight: 700; color: ${isGoogle ? '#059669' : '#64748b'};">
                    ${isGoogle ? '🟢 Google Profile' : '📍 พิกัดที่อยู่ DBD'}
                  </span>
                </div>
                <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
                  ${dbd.name}
                </div>
                <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
                  💰 <b>ทุน:</b> ${dbd.registered_capital ? dbd.registered_capital.toLocaleString() + ' บาท' : '-'}
                </div>
                ${dbd.objective ? `
                  <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.3; max-height: 36px; overflow: hidden;">
                    🏭 ${dbd.objective.slice(0, 65)}...
                  </div>
                ` : ''}
                ${dbd.phone ? `
                  <div style="font-size: 11px; color: #2563eb; margin-bottom: 4px;">
                    📞 <b>${dbd.phone}</b>
                  </div>
                ` : ''}
                <div style="margin-top: 6px;">
                  <a href="${getDbdSearchUrl(dbd)}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 8px; border-radius: 8px; background: #fffbeb; border: 1px solid #fde68a; font-size: 11px; font-weight: 700; color: #b45309; text-decoration: none; cursor: pointer;">
                    <span>🏛️ ดูข้อมูล DBD DataWarehouse+ ↗</span>
                  </a>
                </div>
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                  <button id="btn-dbd-details-${dbd.id}" style="flex: 1; padding: 6px 10px; background: ${isInCrm ? '#059669' : '#d97706'}; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                    ${isInCrm ? '✓ อยู่ใน CRM แล้ว (ดูข้อมูล)' : '+ ดูรายละเอียด / เพิ่มเข้า CRM'}
                  </button>
                </div>
              </div>
            `;

            marker.bindPopup(popupContent);
            marker.on('click', () => {
              setSelectedDbdCompany(dbd);
              setSelectedCustomer(null);
            });

            marker.on('popupopen', () => {
              setSelectedDbdCompany(dbd);
              setSelectedCustomer(null);
              const btn = document.getElementById(`btn-dbd-details-${dbd.id}`);
              if (btn) {
                btn.onclick = () => {
                  setSelectedDbdCompany(dbd);
                  setIsDbdModalOpen(true);
                };
              }
            });

            markersGroup.addLayer(marker);
          } else {
            // CRM CUSTOMER
            const cust: Customer = feature.properties.customer;

            if (selectedCustomer && cust.id === selectedCustomer.id) return;

            const customIcon = L.divIcon({
              className: 'custom-marker-icon',
              html: createSinglePin(cust, false),
              iconSize: [26, 32],
              iconAnchor: [13, 32],
              popupAnchor: [0, -30],
            });

            const marker = L.marker([lat, lng], { icon: customIcon });

            const isCustContacted =
              (cust.activities_count !== undefined && cust.activities_count > 0) ||
              (cust.pipeline_stage && cust.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

            const popupContent = `
              <div style="font-family: inherit; min-width: 230px; max-width: 290px; padding: 2px;">
                <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">
                  #${cust.seq || cust.id} • ${cust.district || 'สมุทรปราการ'}
                </div>
                <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
                  ${cust.name}
                </div>
                <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                  <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${isCustContacted ? '#ecfdf5' : '#f1f5f9'}; color: ${isCustContacted ? '#065f46' : '#334155'}; border: 1px solid ${isCustContacted ? '#a7f3d0' : '#cbd5e1'};">
                    ${isCustContacted ? '✓ ' : ''}${cust.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
                  </span>
                  ${cust.activities_count ? `<span style="font-size: 10px; font-weight: bold; color: #059669; background: #d1fae5; padding: 1px 6px; border-radius: 8px;">${cust.activities_count} กิจกรรม</span>` : ''}
                </div>
                ${cust.latest_activity?.details ? `
                  <div style="font-size: 11px; color: #065f46; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 6px; margin-bottom: 6px; line-height: 1.3;">
                    💬 <b>ล่าสุด (${cust.latest_activity.activity_type}):</b> ${cust.latest_activity.details.slice(0, 60)}...
                  </div>
                ` : ''}
                ${cust.phone ? `
                  <div style="font-size: 12px; color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                    📞 <b>${cust.phone}</b>
                  </div>
                ` : ''}
                <div style="margin-top: 6px;">
                  <a href="${getDbdSearchUrl(cust)}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 8px; border-radius: 8px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 11px; font-weight: 700; color: #1d4ed8; text-decoration: none; cursor: pointer;">
                    <span>🏛️ ดูข้อมูลนิติบุคคล DBD / งบการเงิน ↗</span>
                  </a>
                </div>
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                  <button id="btn-details-${cust.id}" style="flex: 1; padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                    ดูรายละเอียด & บันทึก
                  </button>
                </div>
              </div>
            `;

            marker.bindPopup(popupContent);
            marker.on('click', () => {
              setSelectedCustomer(cust);
              setSelectedDbdCompany(null);
            });

            marker.on('popupopen', () => {
              setSelectedCustomer(cust);
              setSelectedDbdCompany(null);
              const btn = document.getElementById(`btn-details-${cust.id}`);
              if (btn) {
                btn.onclick = () => {
                  setSelectedCustomer(cust);
                  setIsCustomerModalOpen(true);
                };
              }
            });

            markersGroup.addLayer(marker);
          }
        }
      });
    });
  }, [selectedCustomer, selectedDbdCompany, flyToCustomer, flyToDbdCompany]);

  // Dedicated Highlight Layer for Selected Customer or Selected DBD Company
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedMarkerLayerRef.current) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default || leaflet;
      const layer = selectedMarkerLayerRef.current;
      layer.clearLayers();

      // Highlight CRM Customer
      if (selectedCustomer && selectedCustomer.latitude && selectedCustomer.longitude) {
        const customIcon = L.divIcon({
          className: 'custom-marker-icon selected-pin-container',
          html: createSinglePin(selectedCustomer, true),
          iconSize: [44, 54],
          iconAnchor: [22, 54],
          popupAnchor: [0, -52],
        });

        const marker = L.marker([selectedCustomer.latitude, selectedCustomer.longitude], {
          icon: customIcon,
          zIndexOffset: 100000,
        });

        const isSelectedContacted =
          (selectedCustomer.activities_count !== undefined && selectedCustomer.activities_count > 0) ||
          (selectedCustomer.pipeline_stage && selectedCustomer.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

        const popupContent = `
          <div style="font-family: inherit; min-width: 230px; max-width: 290px; padding: 2px;">
            <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">
              #${selectedCustomer.seq || selectedCustomer.id} • ${selectedCustomer.district || 'สมุทรปราการ'}
            </div>
            <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
              ${selectedCustomer.name}
            </div>
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
              <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${isSelectedContacted ? '#ecfdf5' : '#f1f5f9'}; color: ${isSelectedContacted ? '#065f46' : '#334155'}; border: 1px solid ${isSelectedContacted ? '#a7f3d0' : '#cbd5e1'};">
                ${isSelectedContacted ? '✓ ' : ''}${selectedCustomer.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
              </span>
              ${selectedCustomer.activities_count ? `<span style="font-size: 10px; font-weight: bold; color: #059669; background: #d1fae5; padding: 1px 6px; border-radius: 8px;">${selectedCustomer.activities_count} กิจกรรม</span>` : ''}
            </div>
            ${selectedCustomer.phone ? `
              <div style="font-size: 12px; color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                📞 <b>${selectedCustomer.phone}</b>
              </div>
            ` : ''}
            <div style="display: flex; gap: 6px; margin-top: 6px;">
              <button id="btn-details-selected-${selectedCustomer.id}" style="flex: 1; padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                ดูรายละเอียด & บันทึก
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-details-selected-${selectedCustomer.id}`);
          if (btn) {
            btn.onclick = () => {
              setIsCustomerModalOpen(true);
            };
          }
        });

        layer.addLayer(marker);
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          marker.openPopup();
        }
      }

      // Highlight DBD Factory
      if (selectedDbdCompany && selectedDbdCompany.latitude && selectedDbdCompany.longitude) {
        const inCrm = (selectedDbdCompany.tax_id && existingTaxIds.has(selectedDbdCompany.tax_id)) || existingDbdIds.has(selectedDbdCompany.id);

        const customIcon = L.divIcon({
          className: 'custom-marker-icon selected-pin-container',
          html: createDbdSinglePin(selectedDbdCompany, true, inCrm),
          iconSize: [44, 54],
          iconAnchor: [22, 54],
          popupAnchor: [0, -52],
        });

        const marker = L.marker([selectedDbdCompany.latitude, selectedDbdCompany.longitude], {
          icon: customIcon,
          zIndexOffset: 100000,
        });

        const popupContent = `
          <div style="font-family: inherit; min-width: 240px; max-width: 300px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-bottom: 3px;">
              <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 6px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
                🏢 คลังโรงงาน DBD
              </span>
              <span style="font-size: 10px; font-weight: 700; color: ${selectedDbdCompany.pin_type === 'GOOGLE_BUSINESS' ? '#059669' : '#64748b'};">
                ${selectedDbdCompany.pin_type === 'GOOGLE_BUSINESS' ? '🟢 Google Profile' : '📍 พิกัดที่อยู่ DBD'}
              </span>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
              ${selectedDbdCompany.name}
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 4px;">
              💰 <b>ทุน:</b> ${selectedDbdCompany.registered_capital ? selectedDbdCompany.registered_capital.toLocaleString() + ' บาท' : '-'}
            </div>
            <div style="display: flex; gap: 6px; margin-top: 6px;">
              <button id="btn-dbd-details-selected-${selectedDbdCompany.id}" style="flex: 1; padding: 6px 10px; background: ${inCrm ? '#059669' : '#d97706'}; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;">
                ${inCrm ? '✓ อยู่ใน CRM แล้ว (ดูข้อมูล)' : '+ ดูรายละเอียด / เพิ่มเข้า CRM'}
              </button>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-dbd-details-selected-${selectedDbdCompany.id}`);
          if (btn) {
            btn.onclick = () => {
              setIsDbdModalOpen(true);
            };
          }
        });

        layer.addLayer(marker);
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
          marker.openPopup();
        }
      }
    });
  }, [selectedCustomer, selectedDbdCompany, existingTaxIds, existingDbdIds]);

  // Draw or clear District Zones
  const renderDistrictZones = useCallback(() => {
    if (!mapInstanceRef.current || !zonesLayerRef.current) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default || leaflet;
      const zonesGroup = zonesLayerRef.current;
      zonesGroup.clearLayers();

      if (!showZones) return;

      districtZones.forEach((zone) => {
        const polygon = L.polygon(zone.polygon, {
          color: zone.borderColor,
          weight: 2,
          opacity: 0.8,
          dashArray: '6, 8',
          fillColor: zone.fillColor,
          fillOpacity: 0.25,
        });

        polygon.on('click', () => {
          setSelectedDistrict(zone.name);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyToBounds(polygon.getBounds(), { padding: [40, 40], duration: 1 });
          }
        });

        zonesGroup.addLayer(polygon);

        const tagIcon = L.divIcon({
          className: 'custom-marker-icon',
          html: createZoneLabelIcon(zone.name, zone.count, zone.color),
          iconSize: [120, 30],
          iconAnchor: [60, 15],
        });

        const tagMarker = L.marker(zone.center, { icon: tagIcon });
        tagMarker.on('click', () => {
          setSelectedDistrict(zone.name);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyToBounds(polygon.getBounds(), { padding: [40, 40], duration: 1 });
          }
        });

        zonesGroup.addLayer(tagMarker);
      });
    });
  }, [districtZones, showZones]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;
    import('leaflet').then((leaflet) => {
      L = leaflet.default || leaflet;

      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [13.58, 100.70],
        zoom: 11,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // OpenStreetMap Tiles
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const zonesGroup = L.layerGroup().addTo(map);
      const markersGroup = L.layerGroup().addTo(map);
      const selectedGroup = L.layerGroup().addTo(map);

      zonesLayerRef.current = zonesGroup;
      markersLayerRef.current = markersGroup;
      selectedMarkerLayerRef.current = selectedGroup;
      mapInstanceRef.current = map;

      map.on('moveend', () => {
        renderClusteredMarkers();
      });

      renderDistrictZones();
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    renderDistrictZones();
  }, [renderDistrictZones]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
        renderClusteredMarkers();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [showDrawer, renderClusteredMarkers]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fly to Zone
  const flyToZone = (zone: DistrictZone) => {
    setSelectedDistrict(zone.name);
    if (mapInstanceRef.current) {
      import('leaflet').then((leaflet) => {
        const L = leaflet.default || leaflet;
        const bounds = L.latLngBounds(zone.polygon);
        mapInstanceRef.current.flyToBounds(bounds, { padding: [40, 40], duration: 1 });
      });
    }
  };

  // Get User Location
  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          if (mapInstanceRef.current) {
            import('leaflet').then((leaflet) => {
              const L = leaflet.default || leaflet;

              if (userMarkerRef.current) {
                mapInstanceRef.current.removeLayer(userMarkerRef.current);
                userMarkerRef.current = null;
              }

              const userIcon = L.divIcon({
                className: 'custom-marker-icon',
                html: `
                  <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(59, 130, 246, 0.4); animation: radarPulse 2s infinite;"></div>
                    <div style="width: 14px; height: 14px; background: #2563eb; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.8);"></div>
                  </div>
                `,
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              });

              const marker = L.marker([lat, lng], {
                icon: userIcon,
                zIndexOffset: 50000,
              }).addTo(mapInstanceRef.current);

              marker.bindPopup(`
                <div style="font-family: inherit; font-size: 13px; font-weight: 700; color: #1e293b; padding: 2px;">
                  📍 ตำแหน่งปัจจุบันของคุณ
                </div>
              `).openPopup();

              userMarkerRef.current = marker;
            });

            mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
          }
        },
        (err) => {
          alert('ไม่สามารถเข้าถึงตำแหน่งปัจจุบันได้: ' + err.message);
        }
      );
    }
  };

  const handleCustomerUpdated = (updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelectedCustomer(updated);
  };

  const handleCustomerDeleted = (deletedId: number) => {
    setCustomers((prev) => prev.filter((c) => c.id !== deletedId));
    setSelectedCustomer(null);
  };

  const handleCustomerSaved = (savedCustomer: Customer, mode: 'create' | 'edit') => {
    if (mode === 'create') {
      setCustomers((prev) => [savedCustomer, ...prev]);
      flyToCustomer(savedCustomer);
    } else {
      handleCustomerUpdated(savedCustomer);
    }
  };

  const handleDbdImportSuccess = (newCust: Customer) => {
    setCustomers((prev) => [newCust, ...prev]);
    flyToCustomer(newCust);
    setIsDbdModalOpen(false);
  };

  const stageStats = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach((c) => {
      const stage = c.pipeline_stage || 'ยังไม่ได้ติดต่อ';
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [customers]);

  const totalVisiblePins = filteredCustomers.length + filteredDbdCompanies.length;

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] sm:h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-100">
      {/* Map Container */}
      <div className="flex-1 relative h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top Control Bar Overlay */}
        <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-4 z-20 flex flex-col gap-1.5 pointer-events-none">
          {/* Row 1: Search + Dual Layer Toggles */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 pointer-events-auto">
            {/* Search Box */}
            <div className="flex-1 bg-white/95 backdrop-blur-md shadow-md rounded-2xl border border-slate-200/80 p-1.5 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงงาน, เลข Tax ID, เบอร์โทร, สินค้า..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* DUAL LAYER TOGGLE BUTTONS */}
            <div className="flex items-center space-x-1.5 bg-white/95 backdrop-blur-md shadow-md rounded-2xl border border-slate-200/80 p-1 shrink-0">
              {/* CRM Layer Toggle */}
              <button
                onClick={() => setShowCrmLayer(!showCrmLayer)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                  showCrmLayer
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 bg-slate-50 hover:bg-slate-100 opacity-60'
                }`}
                title="เปิด/ปิดหมุดลูกค้า Sales CRM"
              >
                <span>🧑‍💼 ลูกค้า CRM</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${showCrmLayer ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {customers.length}
                </span>
              </button>

              {/* DBD Layer Toggle */}
              <button
                onClick={() => setShowDbdLayer(!showDbdLayer)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                  showDbdLayer
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 bg-slate-50 hover:bg-slate-100 opacity-60'
                }`}
                title="เปิด/ปิดหมุดโรงงานอุตสาหกรรม DBD"
              >
                <span>🏢 คลังโรงงาน DBD</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${showDbdLayer ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {dbdCompanies.length}
                </span>
              </button>
            </div>

            {/* District Filter Dropdown (Desktop) */}
            <div className="hidden sm:flex items-center bg-white/95 backdrop-blur shadow-md rounded-xl border border-slate-200/80 p-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer pr-2"
              >
                <option value="ALL">ทุกอำเภอ/โซน ({districts.length})</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Sub-filter Chips for CRM or DBD */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto">
            {/* Quick Filter: If CRM Layer is ON */}
            {showCrmLayer && (
              <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-md shadow-xs rounded-xl border border-blue-200/70 p-0.5 shrink-0">
                <span className="text-[10px] font-bold text-blue-700 px-1.5">CRM:</span>
                <button
                  onClick={() => setContactFilter('ALL')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${contactFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setContactFilter('CONTACTED')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${contactFilter === 'CONTACTED' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
                >
                  ✓ ติดต่อแล้ว ({statsSummary.contacted})
                </button>
                <button
                  onClick={() => setContactFilter('UNCONTACTED')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${contactFilter === 'UNCONTACTED' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  ยังไม่ติดต่อ ({statsSummary.uncontacted})
                </button>
              </div>
            )}

            {/* Quick Filter: If DBD Layer is ON */}
            {showDbdLayer && (
              <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-md shadow-xs rounded-xl border border-amber-200/70 p-0.5 shrink-0">
                <span className="text-[10px] font-bold text-amber-700 px-1.5">DBD:</span>
                <button
                  onClick={() => setDbdPinFilter('ALL')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${dbdPinFilter === 'ALL' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  ทั้งหมด ({dbdStatsSummary.total})
                </button>
                <button
                  onClick={() => setDbdPinFilter('GOOGLE_BUSINESS')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${dbdPinFilter === 'GOOGLE_BUSINESS' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'}`}
                >
                  🟢 Google ({dbdStatsSummary.googleCount})
                </button>
                <button
                  onClick={() => setDbdPinFilter('DBD_ADDRESS')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${dbdPinFilter === 'DBD_ADDRESS' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  📍 พิกัด DBD ({dbdStatsSummary.addressCount})
                </button>
              </div>
            )}

            {/* Zone Quick Jump Buttons */}
            {districtZones.length > 0 && districtZones.map((zone) => (
              <button
                key={zone.name}
                onClick={() => flyToZone(zone)}
                className={`shrink-0 flex items-center space-x-1 px-2 py-0.5 rounded-xl text-[10px] font-bold shadow-xs transition-all touch-press ${
                  selectedDistrict === zone.name
                    ? 'bg-slate-900 text-white'
                    : 'bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200/90'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: zone.color }} />
                <span>{zone.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Floating Vertical FAB Column on Right Side */}
        <div className="absolute top-44 sm:top-24 right-2.5 sm:right-4 z-20 flex flex-col space-y-2 pointer-events-auto">
          {/* Locate Me (GPS) */}
          <button
            onClick={handleLocateMe}
            title="ตำแหน่งของฉัน"
            className="w-10 h-10 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 shadow-md rounded-2xl border border-slate-200/80 flex items-center justify-center touch-press"
          >
            <Crosshair className="w-5 h-5 text-blue-600" />
          </button>

          {/* Toggle Zone Borders */}
          <button
            onClick={() => setShowZones(!showZones)}
            title="เปิด/ปิดเส้นขอบโซน"
            className={`w-10 h-10 rounded-2xl shadow-md border flex items-center justify-center touch-press transition-all ${
              showZones
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/30'
                : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200/80'
            }`}
          >
            {showZones ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>

          {/* Toggle Drawer / Bottom Sheet */}
          <button
            onClick={() => setShowDrawer(!showDrawer)}
            title="แสดงรายชื่อโรงงาน"
            className={`w-10 h-10 rounded-2xl shadow-md border flex items-center justify-center touch-press relative transition-all ${
              showDrawer
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-600/30'
                : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200/80'
            }`}
          >
            <List className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-blue-600 text-white border border-white">
              {totalVisiblePins}
            </span>
          </button>

          {/* Add New Customer */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            title="+ เพิ่มโรงงานใหม่เข้า CRM"
            className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 rounded-2xl border border-emerald-600 flex items-center justify-center touch-press"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Selected Entity Card on Mobile */}
        {selectedCustomer && !showDrawer && (
          <div className="sm:hidden fixed mobile-action-card-position left-2.5 right-2.5 z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200/90 shadow-2xl animate-slide-up space-y-2 max-h-[70vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                    🧑‍💼 CRM #{selectedCustomer.seq || selectedCustomer.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedCustomer.district || 'สมุทรปราการ'}
                  </span>
                  {(selectedCustomer.activities_count !== undefined && selectedCustomer.activities_count > 0) ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {selectedCustomer.pipeline_stage || 'ติดต่อแล้ว'}
                    </span>
                  ) : null}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug truncate pt-0.5">
                  {selectedCustomer.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {selectedCustomer.phone && (
                <a
                  href={`tel:${selectedCustomer.phone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-semibold touch-press"
                >
                  <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{selectedCustomer.phone}</span>
                </a>
              )}
              <a
                href={getDbdSearchUrl(selectedCustomer)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold touch-press"
              >
                <span>🏛️ DBD DataWarehouse</span>
                <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
              {selectedCustomer.phone ? (
                <a
                  href={`tel:${selectedCustomer.phone.replace(/\s+/g, '')}`}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-600 text-white font-bold text-[10px]"
                >
                  <Phone className="w-3.5 h-3.5 mb-0.5" />
                  <span>โทร</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 text-slate-400 text-[10px]">
                  <span>ไม่มีเบอร์</span>
                </div>
              )}
              <button
                onClick={() => {
                  setEmailCustomer(selectedCustomer);
                  setIsEmailModalOpen(true);
                }}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200"
              >
                <Mail className="w-3.5 h-3.5 mb-0.5" />
                <span>เขียนเมล</span>
              </button>
              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-600 text-white font-bold text-[10px]"
              >
                <Edit className="w-3.5 h-3.5 mb-0.5" />
                <span>รายละเอียด</span>
              </button>
            </div>
          </div>
        )}

        {/* Selected DBD Company Card on Mobile */}
        {selectedDbdCompany && !showDrawer && (
          <div className="sm:hidden fixed mobile-action-card-position left-2.5 right-2.5 z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-amber-200 shadow-2xl animate-slide-up space-y-2 max-h-[70vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                    🏢 คลังโรงงาน DBD
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedDbdCompany.district || 'สมุทรปราการ'}
                  </span>
                  {selectedDbdCompany.pin_type === 'GOOGLE_BUSINESS' ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      🟢 Google Profile
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      📍 พิกัดที่อยู่
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug truncate pt-0.5">
                  {selectedDbdCompany.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedDbdCompany(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-slate-600">
              💰 ทุนจดทะเบียน: <b>{selectedDbdCompany.registered_capital ? selectedDbdCompany.registered_capital.toLocaleString() + ' บาท' : '-'}</b>
            </div>

            <div className="flex gap-2 pt-1 border-t border-slate-100">
              <button
                onClick={() => setIsDbdModalOpen(true)}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5"
              >
                <span>ดูข้อมูลโรงงาน & ดึงเข้า CRM</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Bottom Legend (Desktop only) */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 rounded-2xl p-3 hidden md:block max-w-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>หมุดแผนที่ Smart Map Dual-Layer</span>
            <span>แสดงรวม {totalVisiblePins} โรงงาน</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>ลูกค้า CRM ({filteredCustomers.length})</span>
            </div>
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              <span>โรงงาน DBD ({filteredDbdCompanies.length})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Side Drawer: Tab Switcher (CRM Customers vs DBD Factories) */}
      {showDrawer && (
        <div className="fixed sm:relative mobile-drawer-position sm:bottom-0 left-0 sm:left-auto right-0 sm:right-auto max-h-[65vh] sm:max-h-full sm:h-full w-full sm:w-80 md:w-96 bg-white sm:border-l border-t sm:border-t-0 border-slate-200 shadow-2xl rounded-t-3xl sm:rounded-none flex flex-col z-40 sm:z-30 animate-slide-up sm:animate-in sm:slide-in-from-right duration-200">
          {/* Mobile Drag Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Drawer Tabs Header */}
          <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>รายชื่อโรงงานบนแผนที่</span>
              </h3>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setDrawerTab('CRM')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  drawerTab === 'CRM'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🧑‍💼 ลูกค้า CRM</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${drawerTab === 'CRM' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300/80 text-slate-700'}`}>
                  {filteredCustomers.length}
                </span>
              </button>

              <button
                onClick={() => setDrawerTab('DBD')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  drawerTab === 'DBD'
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🏢 คลัง DBD</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${drawerTab === 'DBD' ? 'bg-amber-100 text-amber-800' : 'bg-slate-300/80 text-slate-700'}`}>
                  {filteredDbdCompanies.length}
                </span>
              </button>
            </div>
          </div>

          {/* Drawer Body List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {drawerTab === 'CRM' ? (
              filteredCustomers.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">ไม่พบลูกค้า CRM ตามเงื่อนไข</p>
                  <p className="text-xs text-slate-400">ลองล้างตัวกรองหรือเปิดเลเยอร์ CRM</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const stageConf = getStageConfig(cust.pipeline_stage);
                  const isSelected = selectedCustomer?.id === cust.id;

                  return (
                    <div
                      key={cust.id}
                      onClick={() => flyToCustomer(cust)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer touch-press ${
                        isSelected
                          ? 'bg-blue-50/95 border-blue-500 ring-2 ring-blue-500/40 shadow-md scale-[1.01]'
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">#{cust.seq || cust.id}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}>
                              {cust.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
                            </span>
                            {cust.activities_count !== undefined && cust.activities_count > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ {cust.activities_count} กิจกรรม
                              </span>
                            )}
                          </div>
                          <h4 className={`font-bold text-xs leading-snug truncate ${isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-900'}`}>
                            {cust.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cust.district || cust.address || 'สมุทรปราการ'}</span>
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(cust);
                            setIsCustomerModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600'
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {cust.phone && (
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">📞 {cust.phone}</span>
                            <a
                              href={`tel:${cust.phone.replace(/\s+/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 font-semibold hover:underline"
                            >
                              โทรเลย
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )
            ) : (
              // DBD TAB LIST
              filteredDbdCompanies.length === 0 ? (
                <div className="text-center py-12 px-4 space-y-2">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-600">ไม่พบโรงงาน DBD ตามเงื่อนไข</p>
                  <p className="text-xs text-slate-400">ลองล้างตัวกรองหรือเปิดเลเยอร์ DBD</p>
                </div>
              ) : (
                filteredDbdCompanies.map((dbd) => {
                  const isSelected = selectedDbdCompany?.id === dbd.id;
                  const inCrm = (dbd.tax_id && existingTaxIds.has(dbd.tax_id)) || existingDbdIds.has(dbd.id);
                  const isGoogle = dbd.pin_type === 'GOOGLE_BUSINESS';

                  return (
                    <div
                      key={dbd.id}
                      onClick={() => flyToDbdCompany(dbd)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer touch-press ${
                        isSelected
                          ? 'bg-amber-50/95 border-amber-500 ring-2 ring-amber-500/40 shadow-md scale-[1.01]'
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                            {isGoogle ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                🟢 Google Profile
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                📍 พิกัดที่อยู่ DBD
                              </span>
                            )}

                            {inCrm && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                                ✓ ใน CRM
                              </span>
                            )}

                            {dbd.registered_capital && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded">
                                ทุน: {(dbd.registered_capital / 1_000_000).toFixed(0)} ลบ.
                              </span>
                            )}
                          </div>

                          <h4 className={`font-bold text-xs leading-snug truncate ${isSelected ? 'text-amber-950 font-extrabold' : 'text-slate-900'}`}>
                            {dbd.name}
                          </h4>

                          <p className="text-[11px] text-slate-500 truncate flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{dbd.district || dbd.province || 'สมุทรปราการ'}</span>
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDbdCompany(dbd);
                            setIsDbdModalOpen(true);
                          }}
                          className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                            isSelected ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-700'
                          }`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}

      {/* CRM Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerUpdated={handleCustomerUpdated}
        onCustomerDeleted={handleCustomerDeleted}
      />

      {/* DBD Factory Detail & 1-Click Import Modal */}
      <DbdCompanyDetailModal
        company={selectedDbdCompany}
        isOpen={isDbdModalOpen}
        isInCrm={
          selectedDbdCompany
            ? Boolean((selectedDbdCompany.tax_id && existingTaxIds.has(selectedDbdCompany.tax_id)) || existingDbdIds.has(selectedDbdCompany.id))
            : false
        }
        crmCustomerId={
          selectedDbdCompany
            ? (selectedDbdCompany.tax_id ? existingTaxIds.get(selectedDbdCompany.tax_id) : (existingDbdIds.get(selectedDbdCompany.id) || null))
            : null
        }
        onClose={() => setIsDbdModalOpen(false)}
        onImportSuccess={handleDbdImportSuccess}
        onNavigateToCustomer={(crmId) => {
          const found = customers.find((c) => c.id === crmId);
          if (found) flyToCustomer(found);
        }}
      />

      {/* Create New Customer Modal */}
      <CustomerFormModal
        isOpen={isCreateModalOpen}
        customer={null}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={handleCustomerSaved}
      />

      {/* Email Compose & Templates Modal */}
      <EmailComposeModal
        isOpen={isEmailModalOpen}
        customer={emailCustomer}
        onClose={() => setIsEmailModalOpen(false)}
        onEmailSent={() => {
          if (emailCustomer) {
            const updatedCust: Customer = {
              ...emailCustomer,
              pipeline_stage: 'ติดต่อแล้ว / ติดตามงาน',
              activities_count: (emailCustomer.activities_count || 0) + 1,
              latest_activity: {
                id: Date.now(),
                customer_id: emailCustomer.id,
                activity_type: 'ส่งอีเมล',
                activity_date: new Date().toISOString(),
                contact_person: emailCustomer.contact_person || null,
                details: `ส่งอีเมล E-Catalog CHICAI ELECTRIC (ลดต้นทุน 70% + On-site Demo)`,
                next_action_date: null,
                next_action_note: null,
              },
            };
            handleCustomerUpdated(updatedCust);
          }
        }}
      />
    </div>
  );
}
