'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Customer, DBDCompany, PIPELINE_STAGES, getStageConfig } from '@/types/customer';
import { fetchAllCustomers, subscribeToRealtimeChanges, supabase } from '@/lib/supabase';
import CustomerDetailModal from './CustomerDetailModal';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
import EmailComposeModal from '@/components/common/EmailComposeModal';
import { generateDistrictZones, DistrictZone } from '@/lib/geo';
import { getDbdSearchUrl, getCleanCompanyName } from '@/lib/utils';
import Supercluster from 'supercluster';
import {
  Search,
  Filter,
  MapPin,
  Phone,
  ExternalLink,
  ChevronRight,
  List,
  Crosshair,
  Calendar,
  AlertCircle,
  X,
  Plus,
  Eye,
  EyeOff,
  Mail,
  Edit,
  Navigation,
  CheckCircle2,
  Building2
} from 'lucide-react';

interface UnifiedFactory {
  id: string; // 'crm_123' or 'dbd_456'
  crm_id?: number;
  dbd_id?: number;
  seq?: number | null;
  name: string;
  phone: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  website: string | null;
  google_maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  business_type: string | null;
  pipeline_stage: string;
  contact_person: string | null;
  target_product: string | null;
  notes: string | null;
  email: string | null;
  tax_id?: string | null;
  registered_capital?: number | null;
  objective?: string | null;
  tsic_code?: string | null;
  activities_count?: number;
  latest_activity?: any;
  is_crm: boolean;
}

interface CustomerMapInnerProps {
  initialCustomers: Customer[];
  initialDbdCompanies?: DBDCompany[];
}

// Function to generate clean minimal SVG Pin for any factory
function createFactoryPin(factory: UnifiedFactory, isSelected: boolean = false) {
  const stage = factory.pipeline_stage || 'ยังไม่ได้ติดต่อ';
  const hasContact =
    (factory.activities_count !== undefined && factory.activities_count > 0) ||
    (stage && stage !== 'ยังไม่ได้ติดต่อ');

  let pinColor = '#3b82f6'; // default uncontacted: modern royal blue
  let isContacted = false;

  if (hasContact) {
    isContacted = true;
    if (stage.includes('ติดต่อแล้ว') || stage.includes('ติดตามงาน')) pinColor = '#f59e0b'; // vibrant amber
    else if (stage.includes('นัดหมาย') || stage.includes('Demo')) pinColor = '#2563eb'; // blue
    else if (stage.includes('เสนอราคา')) pinColor = '#7c3aed'; // purple
    else if (stage.includes('สำเร็จ') || stage.includes('ปิดการขาย')) pinColor = '#059669'; // emerald
    else if (stage.includes('ไม่สนใจ') || stage.includes('ไม่ได้')) pinColor = '#e11d48'; // rose
    else pinColor = '#10b981'; // default contacted
  }

  if (isSelected) {
    return `
      <div style="position: relative; width: 48px; height: 58px; display: flex; align-items: flex-end; justify-content: center; cursor: pointer; z-index: 99999;">
        <!-- Radar Pulse Waves -->
        <div class="radar-ring" style="border-color: ${isContacted ? '#10b981' : '#3b82f6'};"></div>
        <div class="radar-ring-2" style="border-color: ${isContacted ? '#10b981' : '#3b82f6'};"></div>

        <!-- Floating Name Tag Badge -->
        <div style="
          position: absolute;
          bottom: 62px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #ffffff;
          padding: 5px 12px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          border: 1.5px solid ${isContacted ? '#10b981' : '#60a5fa'};
          display: flex;
          align-items: center;
          gap: 6px;
          pointer-events: none;
        ">
          <span>${isContacted ? '✅' : '🏢'}</span>
          <span>${factory.name}</span>
          ${factory.activities_count ? `<span style="background: #10b981; color: white; border-radius: 9999px; padding: 1px 6px; font-size: 9px; font-weight: 800;">${factory.activities_count} ครั้ง</span>` : ''}
        </div>

        <svg width="44" height="54" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="${isContacted ? '#10b981' : '#60a5fa'}"/>
          <path d="M16 2C8.268 2 2 8.268 2 16c0 10.5 14 21 14 21s14-10.5 14-21c0-7.732-6.268-14-14-14z" fill="${pinColor}"/>
          <circle cx="16" cy="15" r="7" fill="#ffffff"/>
          <circle cx="16" cy="15" r="4" fill="${isContacted ? '#10b981' : '#3b82f6'}"/>
        </svg>
      </div>
    `;
  }

  if (isContacted) {
    const countBadge = factory.activities_count && factory.activities_count > 1 ? factory.activities_count : '✓';
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

  // Uncontacted Factory Pin
  return `
    <div style="position: relative; width: 26px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.92;">
      <svg width="24" height="30" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3)); transition: transform 0.15s ease;">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 19 13 19s13-9.25 13-19c0-7.18-5.82-13-13-13z" fill="#2563eb"/>
        <path d="M13 1.5C6.65 1.5 1.5 6.65 1.5 13c0 8.5 11.5 17 11.5 17s11.5-8.5 11.5-17c0-6.35-5.15-11.5-11.5-11.5z" stroke="#ffffff" stroke-width="1"/>
        <circle cx="13" cy="12" r="4.5" fill="#ffffff"/>
        <circle cx="13" cy="12" r="2.5" fill="#2563eb"/>
      </svg>
    </div>
  `;
}

// Function to generate clean Cluster bubble
function createClusterIcon(count: number) {
  let size = 36;
  let bgGradient = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
  let shadow = 'rgba(37, 99, 235, 0.4)';

  if (count >= 100) {
    size = 48;
    bgGradient = 'linear-gradient(135deg, #4f46e5, #3730a3)';
    shadow = 'rgba(79, 70, 229, 0.5)';
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
  const [rawCustomers, setRawCustomers] = useState<Customer[]>(initialCustomers);
  const [rawDbdCompanies, setRawDbdCompanies] = useState<DBDCompany[]>(initialDbdCompanies);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [contactFilter, setContactFilter] = useState<'ALL' | 'CONTACTED' | 'UNCONTACTED'>('ALL');
  const [showZones, setShowZones] = useState(true);

  // Drawer
  const [showDrawer, setShowDrawer] = useState(true);

  // Selected factory
  const [selectedFactory, setSelectedFactory] = useState<UnifiedFactory | null>(null);

  // Modals
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
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

  // Realtime subscription for CRM changes
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeChanges(['customers', 'customer_activities'], async () => {
      try {
        const fresh = await fetchAllCustomers();
        if (fresh && fresh.length > 0) {
          setRawCustomers(fresh);
        }
      } catch (err) {
        console.error('Error syncing realtime customers on map:', err);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 1. UNIFIED FACTORIES MERGE & DEDUPLICATION (Under the hood)
  const unifiedFactories = useMemo<UnifiedFactory[]>(() => {
    const list: UnifiedFactory[] = [];
    const taxMap = new Map<string, Customer>();
    const dbdIdMap = new Map<number, Customer>();
    const nameMap = new Map<string, Customer>();

    // Index existing CRM customers
    rawCustomers.forEach((c) => {
      if (c.tax_id) taxMap.set(c.tax_id.trim(), c);
      if (c.dbd_company_id) dbdIdMap.set(c.dbd_company_id, c);
      if (c.name) nameMap.set(getCleanCompanyName(c.name).toLowerCase(), c);
    });

    // 1. Add all CRM customers
    rawCustomers.forEach((c) => {
      if (!c.latitude || !c.longitude) return;
      list.push({
        id: `crm_${c.id}`,
        crm_id: c.id,
        dbd_id: c.dbd_company_id || undefined,
        seq: c.seq,
        name: c.name,
        phone: c.phone,
        address: c.address,
        district: normalizeDistrictName(c.district),
        province: c.province || 'สมุทรปราการ',
        website: c.website,
        google_maps_url: c.google_maps_url,
        latitude: c.latitude,
        longitude: c.longitude,
        business_type: c.business_type,
        pipeline_stage: c.pipeline_stage || 'ยังไม่ได้ติดต่อ',
        contact_person: c.contact_person,
        target_product: c.target_product,
        notes: c.notes,
        email: c.email,
        tax_id: c.tax_id,
        registered_capital: c.registered_capital,
        activities_count: c.activities_count,
        latest_activity: c.latest_activity,
        is_crm: true,
      });
    });

    // 2. Add non-duplicate DBD companies as fresh leads
    rawDbdCompanies.forEach((d) => {
      if (!d.latitude || !d.longitude) return;

      // Check if already in CRM
      if (d.tax_id && taxMap.has(d.tax_id.trim())) return;
      if (dbdIdMap.has(d.id)) return;
      const clean = getCleanCompanyName(d.name).toLowerCase();
      if (clean && nameMap.has(clean)) return;

      list.push({
        id: `dbd_${d.id}`,
        dbd_id: d.id,
        name: d.name,
        phone: d.phone,
        address: d.address ? `${d.address} ต.${d.subdistrict || ''} อ.${d.district || ''} จ.${d.province || ''}` : null,
        district: normalizeDistrictName(d.district),
        province: d.province || 'สมุทรปราการ',
        website: d.website,
        google_maps_url: d.google_maps_url,
        latitude: d.latitude,
        longitude: d.longitude,
        business_type: d.objective || d.industry_group || 'โรงงานอุตสาหกรรมการผลิต',
        pipeline_stage: 'ยังไม่ได้ติดต่อ',
        contact_person: null,
        target_product: null,
        notes: null,
        email: d.email || null,
        tax_id: d.tax_id,
        registered_capital: d.registered_capital,
        objective: d.objective,
        tsic_code: d.tsic_code,
        activities_count: 0,
        is_crm: false,
      });
    });

    return list;
  }, [rawCustomers, rawDbdCompanies]);

function normalizeDistrictName(raw?: string | null): string {
  if (!raw) return 'สมุทรปราการ';
  let s = raw.trim().replace(/^อ\./, '').replace(/^อำเภอ/, '').trim();
  if (s === 'เมือง' || s === 'เมืองฯ') s = 'เมืองสมุทรปราการ';
  return s;
}

  // Summary counts of contacted vs uncontacted
  const statsSummary = useMemo(() => {
    let contacted = 0;
    let uncontacted = 0;
    unifiedFactories.forEach((f) => {
      const hasContact =
        (f.activities_count !== undefined && f.activities_count > 0) ||
        (f.pipeline_stage && f.pipeline_stage !== 'ยังไม่ได้ติดต่อ');
      if (hasContact) contacted++;
      else uncontacted++;
    });
    return { contacted, uncontacted, total: unifiedFactories.length };
  }, [unifiedFactories]);

  // Generate District Zones automatically from all unified points
  const districtZones = useMemo(() => {
    return generateDistrictZones(unifiedFactories, 10);
  }, [unifiedFactories]);

  // Extract unique districts
  const districts = useMemo(() => {
    const set = new Set<string>();
    unifiedFactories.forEach((f) => {
      if (f.district && f.district.trim()) set.add(f.district.trim());
    });
    return Array.from(set).sort();
  }, [unifiedFactories]);

  // Filtered factories list
  const filteredFactories = useMemo(() => {
    return unifiedFactories.filter((f) => {
      if (!f.latitude || !f.longitude) return false;
      if (selectedDistrict !== 'ALL' && f.district !== selectedDistrict) return false;
      if (selectedStage !== 'ALL' && f.pipeline_stage !== selectedStage) return false;

      // Contact Status Filter
      const hasContact =
        (f.activities_count !== undefined && f.activities_count > 0) ||
        (f.pipeline_stage && f.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

      if (contactFilter === 'CONTACTED' && !hasContact) return false;
      if (contactFilter === 'UNCONTACTED' && hasContact) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchPhone = f.phone && f.phone.toLowerCase().includes(q);
        const matchType = f.business_type && f.business_type.toLowerCase().includes(q);
        const matchAddr = f.address && f.address.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchType && !matchAddr) return false;
      }
      return true;
    });
  }, [unifiedFactories, selectedDistrict, selectedStage, contactFilter, searchQuery]);

  // Fly to Factory
  const flyToFactory = useCallback((factory: UnifiedFactory) => {
    setSelectedFactory(factory);
    if (mapInstanceRef.current && factory.latitude && factory.longitude) {
      mapInstanceRef.current.flyTo([factory.latitude, factory.longitude], 16, {
        duration: 0.8,
      });
    }
  }, []);

  // Build Supercluster index
  useEffect(() => {
    const points = filteredFactories.map((f) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        factory: f,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [f.longitude!, f.latitude!],
      },
    }));

    const index = new Supercluster({
      radius: 60,
      maxZoom: 17,
      minPoints: 2,
    });

    index.load(points);
    superclusterRef.current = index;
    renderClusteredMarkers();
  }, [filteredFactories]);

  // Convert UnifiedFactory to Customer object for modal compatibility
  const getCustomerFromFactory = (f: UnifiedFactory): Customer => {
    if (f.crm_id) {
      const found = rawCustomers.find((c) => c.id === f.crm_id);
      if (found) return found;
    }
    return {
      id: f.crm_id || 0,
      seq: f.seq || null,
      name: f.name,
      phone: f.phone,
      address: f.address,
      district: f.district,
      province: f.province || 'สมุทรปราการ',
      website: f.website,
      google_maps_url: f.google_maps_url,
      latitude: f.latitude,
      longitude: f.longitude,
      business_type: f.business_type,
      pipeline_stage: f.pipeline_stage,
      contact_person: f.contact_person,
      target_product: f.target_product,
      notes: f.notes,
      email: f.email,
      tax_id: f.tax_id,
      dbd_company_id: f.dbd_id,
      registered_capital: f.registered_capital,
      activities_count: f.activities_count,
      latest_activity: f.latest_activity,
      rating: null,
      review_count: null,
      operating_status: null,
      place_id: null,
      contact_result: null,
    };
  };

  // Seamless Save / Update Customer Handler
  const handleSaveAndSyncCustomer = async (cust: Customer) => {
    if (!cust.id || cust.id === 0) {
      // Create new customer in CRM from DBD lead
      const payload: any = {
        name: cust.name,
        address: cust.address,
        district: cust.district,
        province: cust.province || 'สมุทรปราการ',
        phone: cust.phone,
        website: cust.website,
        google_maps_url: cust.google_maps_url,
        latitude: cust.latitude,
        longitude: cust.longitude,
        business_type: cust.business_type || 'โรงงานอุตสาหกรรมการผลิต',
        pipeline_stage: cust.pipeline_stage || 'ติดต่อแล้ว / ติดตามงาน',
        contact_person: cust.contact_person,
        notes: cust.notes,
        email: cust.email,
        tax_id: cust.tax_id,
        dbd_company_id: cust.dbd_company_id,
      };

      const { data, error } = await supabase.from('customers').insert([payload]).select().single();
      if (!error && data) {
        setRawCustomers((prev) => [data, ...prev]);
        setSelectedFactory({
          ...selectedFactory!,
          crm_id: data.id,
          id: `crm_${data.id}`,
          is_crm: true,
          pipeline_stage: data.pipeline_stage,
        });
      }
    } else {
      setRawCustomers((prev) => prev.map((c) => (c.id === cust.id ? cust : c)));
      if (selectedFactory) {
        setSelectedFactory({
          ...selectedFactory,
          pipeline_stage: cust.pipeline_stage,
          activities_count: cust.activities_count,
          latest_activity: cust.latest_activity,
        });
      }
    }
  };

  // Render clusters and single markers
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
                    🏭 มี ${leaves.length} โรงงานในบริเวณนี้
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
              `;

              leaves.forEach((l: any) => {
                const f: UnifiedFactory = l.properties.factory;
                const hasContact =
                  (f.activities_count !== undefined && f.activities_count > 0) ||
                  (f.pipeline_stage && f.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

                leavesHtml += `
                  <div id="leaf-select-${f.id}" style="padding: 6px 8px; border-radius: 8px; background: ${hasContact ? '#f0fdf4' : '#f8fafc'}; border: 1px solid ${hasContact ? '#bbf7d0' : '#cbd5e1'}; cursor: pointer; transition: background 0.15s ease;">
                    <div style="font-size: 12px; font-weight: 700; color: #1e293b;">🏢 ${f.name}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">📞 ${f.phone || '-'} • <span style="color: ${hasContact ? '#059669' : '#2563eb'}; font-weight: 600;">${f.pipeline_stage || 'ยังไม่ได้ติดต่อ'}</span></div>
                  </div>
                `;
              });
              leavesHtml += `</div></div>`;

              L.popup().setLatLng([lat, lng]).setContent(leavesHtml).openOn(map);

              setTimeout(() => {
                leaves.forEach((l: any) => {
                  const f: UnifiedFactory = l.properties.factory;
                  const el = document.getElementById(`leaf-select-${f.id}`);
                  if (el) {
                    el.onclick = () => {
                      map.closePopup();
                      flyToFactory(f);
                    };
                  }
                });
              }, 100);
            } else {
              map.flyTo([lat, lng], Math.min(expansionZoom, 17), { duration: 0.8 });
            }
          });

          markersGroup.addLayer(marker);
        } else {
          // SINGLE FACTORY PIN
          const factory: UnifiedFactory = feature.properties.factory;

          if (selectedFactory && factory.id === selectedFactory.id) return;

          const customIcon = L.divIcon({
            className: 'custom-marker-icon',
            html: createFactoryPin(factory, false),
            iconSize: [26, 32],
            iconAnchor: [13, 32],
            popupAnchor: [0, -30],
          });

          const marker = L.marker([lat, lng], { icon: customIcon });

          const isContacted =
            (factory.activities_count !== undefined && factory.activities_count > 0) ||
            (factory.pipeline_stage && factory.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

          const popupContent = `
            <div style="font-family: inherit; min-width: 230px; max-width: 290px; padding: 2px;">
              <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">
                📍 ${factory.district || 'สมุทรปราการ'}
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
                ${factory.name}
              </div>
              <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${isContacted ? '#ecfdf5' : '#eff6ff'}; color: ${isContacted ? '#065f46' : '#1e40af'}; border: 1px solid ${isContacted ? '#a7f3d0' : '#bfdbfe'};">
                  ${isContacted ? '✓ ' : ''}${factory.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
                </span>
                ${factory.activities_count ? `<span style="font-size: 10px; font-weight: bold; color: #059669; background: #d1fae5; padding: 1px 6px; border-radius: 8px;">${factory.activities_count} กิจกรรม</span>` : ''}
              </div>
              ${factory.phone ? `
                <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
                  📞 <b>${factory.phone}</b>
                </div>
              ` : ''}
              <div style="display: flex; gap: 6px; margin-top: 6px;">
                <button id="btn-popup-details-${factory.id}" style="flex: 1; padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
                  ดูรายละเอียด & บันทึกงานขาย
                </button>
              </div>
            </div>
          `;

          marker.bindPopup(popupContent);

          marker.on('click', () => {
            setSelectedFactory(factory);
          });

          marker.on('popupopen', () => {
            setSelectedFactory(factory);
            const btn = document.getElementById(`btn-popup-details-${factory.id}`);
            if (btn) {
              btn.onclick = () => {
                setSelectedFactory(factory);
                setIsDetailModalOpen(true);
              };
            }
          });

          markersGroup.addLayer(marker);
        }
      });
    });
  }, [selectedFactory, flyToFactory]);

  // Dedicated Highlight Layer for Selected Factory
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedMarkerLayerRef.current) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default || leaflet;
      const layer = selectedMarkerLayerRef.current;
      layer.clearLayers();

      if (!selectedFactory || !selectedFactory.latitude || !selectedFactory.longitude) return;

      const customIcon = L.divIcon({
        className: 'custom-marker-icon selected-pin-container',
        html: createFactoryPin(selectedFactory, true),
        iconSize: [44, 54],
        iconAnchor: [22, 54],
        popupAnchor: [0, -52],
      });

      const marker = L.marker([selectedFactory.latitude, selectedFactory.longitude], {
        icon: customIcon,
        zIndexOffset: 100000,
      });

      const isContacted =
        (selectedFactory.activities_count !== undefined && selectedFactory.activities_count > 0) ||
        (selectedFactory.pipeline_stage && selectedFactory.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

      const popupContent = `
        <div style="font-family: inherit; min-width: 230px; max-width: 290px; padding: 2px;">
          <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 2px;">
            📍 ${selectedFactory.district || 'สมุทรปราการ'}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 4px; line-height: 1.3;">
            ${selectedFactory.name}
          </div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px; flex-wrap: wrap;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background-color: ${isContacted ? '#ecfdf5' : '#eff6ff'}; color: ${isContacted ? '#065f46' : '#1e40af'}; border: 1px solid ${isContacted ? '#a7f3d0' : '#bfdbfe'};">
              ${isContacted ? '✓ ' : ''}${selectedFactory.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
            </span>
            ${selectedFactory.activities_count ? `<span style="font-size: 10px; font-weight: bold; color: #059669; background: #d1fae5; padding: 1px 6px; border-radius: 8px;">${selectedFactory.activities_count} กิจกรรม</span>` : ''}
          </div>
          ${selectedFactory.phone ? `
            <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
              📞 <b>${selectedFactory.phone}</b>
            </div>
          ` : ''}
          <div style="display: flex; gap: 6px; margin-top: 6px;">
            <button id="btn-details-selected-${selectedFactory.id}" style="flex: 1; padding: 6px 10px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer;">
              ดูรายละเอียด & บันทึกงานขาย
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-details-selected-${selectedFactory.id}`);
        if (btn) {
          btn.onclick = () => {
            setIsDetailModalOpen(true);
          };
        }
      });

      layer.addLayer(marker);
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        marker.openPopup();
      }
    });
  }, [selectedFactory]);

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

      // Clean OpenStreetMap Tiles
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

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] sm:h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-100">
      {/* Map Container */}
      <div className="flex-1 relative h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top Control Bar Overlay */}
        <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-4 z-20 flex flex-col gap-1.5 pointer-events-none">
          {/* Row 1: Search + Quick Status Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 pointer-events-auto">
            {/* Search Box */}
            <div className="flex-1 bg-white/95 backdrop-blur-md shadow-md rounded-2xl border border-slate-200/80 p-1.5 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหาชื่อโรงงาน, เบอร์โทร, อำเภอ, สินค้า..."
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

            {/* Quick Status Filter Pills */}
            <div className="flex items-center space-x-1 bg-white/95 backdrop-blur-md shadow-md rounded-2xl border border-slate-200/80 p-1 shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setContactFilter('ALL')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all touch-press ${
                  contactFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด ({statsSummary.total})
              </button>
              <button
                onClick={() => setContactFilter('CONTACTED')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all touch-press ${
                  contactFilter === 'CONTACTED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60'
                }`}
              >
                <span>✓ ติดต่อแล้ว</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30 font-extrabold">
                  {statsSummary.contacted}
                </span>
              </button>
              <button
                onClick={() => setContactFilter('UNCONTACTED')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all touch-press ${
                  contactFilter === 'UNCONTACTED'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60'
                }`}
              >
                <span>ยังไม่ได้ติดต่อ</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/30 font-semibold">
                  {statsSummary.uncontacted}
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

          {/* Row 2: District Zone Quick Jump Buttons */}
          {districtZones.length > 0 && (
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5 pointer-events-auto">
              {selectedDistrict !== 'ALL' && (
                <button
                  onClick={() => setSelectedDistrict('ALL')}
                  className="shrink-0 flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-600 text-white shadow-xs touch-press"
                >
                  <span>✕ ล้างโซน</span>
                </button>
              )}
              {districtZones.map((zone) => (
                <button
                  key={zone.name}
                  onClick={() => flyToZone(zone)}
                  className={`shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xs transition-all touch-press ${
                    selectedDistrict === zone.name
                      ? 'bg-slate-900 text-white scale-105'
                      : 'bg-white/95 backdrop-blur-md text-slate-700 border border-slate-200/90'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: zone.color }} />
                  <span>{zone.name}</span>
                  <span className="text-[10px] opacity-75 font-semibold">({zone.count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Floating Vertical FAB Column on Right Side */}
        <div className="absolute top-36 sm:top-20 right-2.5 sm:right-4 z-20 flex flex-col space-y-2 pointer-events-auto">
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
              {filteredFactories.length}
            </span>
          </button>

          {/* Add New Factory */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            title="+ เพิ่มโรงงานใหม่"
            className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30 rounded-2xl border border-emerald-600 flex items-center justify-center touch-press"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Selected Factory Action Card on Mobile */}
        {selectedFactory && !showDrawer && (
          <div className="sm:hidden fixed mobile-action-card-position left-2.5 right-2.5 z-40 bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-slate-200/90 shadow-2xl animate-slide-up space-y-2 max-h-[70vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {selectedFactory.district || 'สมุทรปราการ'}
                  </span>
                  {(selectedFactory.activities_count !== undefined && selectedFactory.activities_count > 0) || (selectedFactory.pipeline_stage && selectedFactory.pipeline_stage !== 'ยังไม่ได้ติดต่อ') ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ {selectedFactory.pipeline_stage || 'ติดต่อแล้ว'}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      ⚪ ยังไม่ได้ติดต่อ
                    </span>
                  )}
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug truncate pt-0.5">
                  {selectedFactory.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedFactory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
              {selectedFactory.phone ? (
                <a
                  href={`tel:${selectedFactory.phone.replace(/\s+/g, '')}`}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm touch-press active:scale-95"
                >
                  <Phone className="w-3.5 h-3.5 mb-0.5" />
                  <span>โทรออก</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-100 text-slate-400 text-[10px]">
                  <Phone className="w-3.5 h-3.5 mb-0.5" />
                  <span>ไม่มีเบอร์</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setEmailCustomer(getCustomerFromFactory(selectedFactory));
                  setIsEmailModalOpen(true);
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[10px] font-bold touch-press ${
                  selectedFactory.email
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                <Mail className={`w-3.5 h-3.5 mb-0.5 ${selectedFactory.email ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{selectedFactory.email ? 'ส่งเมล' : 'เขียนเมล'}</span>
              </button>

              {selectedFactory.latitude && selectedFactory.longitude ? (
                <a
                  href={selectedFactory.google_maps_url || `https://www.google.com/maps?q=${selectedFactory.latitude},${selectedFactory.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-[10px] font-bold touch-press"
                >
                  <Navigation className="w-3.5 h-3.5 mb-0.5 text-blue-600" />
                  <span>นำทาง</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 text-slate-300 text-[10px]">
                  <Navigation className="w-3.5 h-3.5 mb-0.5" />
                  <span>ไม่มีพิกัด</span>
                </div>
              )}

              <button
                onClick={() => setIsDetailModalOpen(true)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm text-[10px] font-bold touch-press active:scale-95"
              >
                <Edit className="w-3.5 h-3.5 mb-0.5" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Bottom Status Bar (Desktop only) */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 rounded-2xl p-3 hidden md:block max-w-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>แผนที่โรงงานอัจฉริยะ (Smart Map)</span>
            <span>แสดง {filteredFactories.length} / {unifiedFactories.length} โรงงาน</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => setContactFilter('ALL')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                contactFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>ทั้งหมด ({statsSummary.total})</span>
            </button>
            <button
              onClick={() => setContactFilter(contactFilter === 'CONTACTED' ? 'ALL' : 'CONTACTED')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                contactFilter === 'CONTACTED'
                  ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>ติดต่อแล้ว ({statsSummary.contacted})</span>
            </button>
            <button
              onClick={() => setContactFilter(contactFilter === 'UNCONTACTED' ? 'ALL' : 'UNCONTACTED')}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                contactFilter === 'UNCONTACTED'
                  ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400'
                  : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>ยังไม่ได้ติดต่อ ({statsSummary.uncontacted})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Factory List Drawer: Desktop Side Drawer & Mobile Bottom Sheet */}
      {showDrawer && (
        <div className="fixed sm:relative mobile-drawer-position sm:bottom-0 left-0 sm:left-auto right-0 sm:right-auto max-h-[65vh] sm:max-h-full sm:h-full w-full sm:w-80 md:w-96 bg-white sm:border-l border-t sm:border-t-0 border-slate-200 shadow-2xl rounded-t-3xl sm:rounded-none flex flex-col z-40 sm:z-30 animate-slide-up sm:animate-in sm:slide-in-from-right duration-200">
          {/* Mobile Drag Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Drawer Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <span>รายชื่อโรงงานในพื้นที่</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  {filteredFactories.length}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">แตะเพื่อดูตำแหน่งบนแผนที่</p>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Factory Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredFactories.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">ไม่พบโรงงานตามเงื่อนไข</p>
                <p className="text-xs text-slate-400">ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา</p>
              </div>
            ) : (
              filteredFactories.map((fact) => {
                const stageConf = getStageConfig(fact.pipeline_stage);
                const isSelected = selectedFactory?.id === fact.id;
                const isContacted =
                  (fact.activities_count !== undefined && fact.activities_count > 0) ||
                  (fact.pipeline_stage && fact.pipeline_stage !== 'ยังไม่ได้ติดต่อ');

                return (
                  <div
                    key={fact.id}
                    onClick={() => flyToFactory(fact)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer touch-press ${
                      isSelected
                        ? 'bg-blue-50/95 border-blue-500 ring-2 ring-blue-500/40 shadow-md scale-[1.01]'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${stageConf.bg} ${stageConf.color} ${stageConf.border}`}>
                            {fact.pipeline_stage || 'ยังไม่ได้ติดต่อ'}
                          </span>
                          {fact.activities_count !== undefined && fact.activities_count > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ {fact.activities_count} กิจกรรม
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-600 text-white animate-pulse">
                              📍 กำลังเลือก
                            </span>
                          )}
                        </div>

                        <h4 className={`font-bold text-xs leading-snug truncate ${isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-900'}`}>
                          {fact.name}
                        </h4>

                        <p className="text-[11px] text-slate-500 truncate flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{fact.district || fact.address || 'สมุทรปราการ'}</span>
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFactory(fact);
                          setIsDetailModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600'
                        }`}
                        title="ดูรายละเอียด & บันทึกงานขาย"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {(fact.phone || fact.email) && (
                      <div className="mt-2 pt-2 border-t border-slate-100/80 space-y-1 text-[11px]">
                        {fact.phone && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">📞 {fact.phone}</span>
                            <a
                              href={`tel:${fact.phone.replace(/\s+/g, '')}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-600 font-semibold hover:underline"
                            >
                              โทรเลย
                            </a>
                          </div>
                        )}
                        {fact.email && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium truncate max-w-[180px]">✉️ {fact.email}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEmailCustomer(getCustomerFromFactory(fact));
                                setIsEmailModalOpen(true);
                              }}
                              className="text-blue-600 font-semibold hover:underline shrink-0"
                            >
                              ส่งอีเมล / Gmail
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Factory Detail & Sales Action Modal */}
      {selectedFactory && (
        <CustomerDetailModal
          customer={getCustomerFromFactory(selectedFactory)}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onCustomerUpdated={(updated) => {
            handleSaveAndSyncCustomer(updated);
          }}
          onCustomerDeleted={(deletedId) => {
            setRawCustomers((prev) => prev.filter((c) => c.id !== deletedId));
            setSelectedFactory(null);
          }}
        />
      )}

      {/* Create New Factory Modal */}
      <CustomerFormModal
        isOpen={isCreateModalOpen}
        customer={null}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={(newCustomer) => {
          setRawCustomers((prev) => [newCustomer, ...prev]);
          const newFact: UnifiedFactory = {
            id: `crm_${newCustomer.id}`,
            crm_id: newCustomer.id,
            name: newCustomer.name,
            phone: newCustomer.phone,
            address: newCustomer.address,
            district: newCustomer.district,
            province: newCustomer.province || 'สมุทรปราการ',
            website: newCustomer.website,
            google_maps_url: newCustomer.google_maps_url,
            latitude: newCustomer.latitude,
            longitude: newCustomer.longitude,
            business_type: newCustomer.business_type,
            pipeline_stage: newCustomer.pipeline_stage || 'ยังไม่ได้ติดต่อ',
            contact_person: newCustomer.contact_person,
            target_product: newCustomer.target_product,
            notes: newCustomer.notes,
            email: newCustomer.email,
            is_crm: true,
          };
          setSelectedFactory(newFact);
          flyToFactory(newFact);
        }}
      />

      {/* Email Compose Modal */}
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
            };
            handleSaveAndSyncCustomer(updatedCust);
          }
        }}
      />
    </div>
  );
}
