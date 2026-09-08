'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Customer, PIPELINE_STAGES, getStageConfig } from '@/types/customer';
import CustomerDetailModal from './CustomerDetailModal';
import CustomerFormModal from '@/components/customers/CustomerFormModal';
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
  Mail,
  Edit
} from 'lucide-react';

interface CustomerMapInnerProps {
  initialCustomers: Customer[];
}

// Function to generate sleek minimal SVG Pin icon for single factory
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
        <!-- Radar Pulse Waves anchored at bottom center -->
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
          border: 1.5px solid ${isContacted ? '#10b981' : '#fbbf24'};
          display: flex;
          align-items: center;
          gap: 5px;
          pointer-events: none;
        ">
          <span>${isContacted ? '✅' : '🏢'}</span>
          <span>${customer.name}</span>
          ${customer.activities_count ? `<span style="background: #10b981; color: white; border-radius: 9999px; padding: 1px 5px; font-size: 9px; font-weight: 800;">${customer.activities_count} ครั้ง</span>` : ''}
        </div>

        <!-- Large Selected Pin with Golden/Green Ring -->
        <svg width="44" height="54" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="${isContacted ? '#10b981' : '#fbbf24'}"/>
          <path d="M16 2C8.268 2 2 8.268 2 16c0 10.5 14 21 14 21s14-10.5 14-21c0-7.732-6.268-14-14-14z" fill="${pinColor}"/>
          <circle cx="16" cy="15" r="7" fill="#ffffff"/>
          <circle cx="16" cy="15" r="4" fill="${isContacted ? '#10b981' : '#fbbf24'}"/>
        </svg>
      </div>
    `;
  }

  if (isContacted) {
    // Contacted Pin: Vivid Color + Checkmark / Activity Badge on top right
    const countBadge = customer.activities_count && customer.activities_count > 1 ? customer.activities_count : '✓';
    return `
      <div style="position: relative; width: 30px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg width="28" height="34" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); transition: transform 0.15s ease;">
          <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 19 13 19s13-9.25 13-19c0-7.18-5.82-13-13-13z" fill="${pinColor}"/>
          <path d="M13 1.5C6.65 1.5 1.5 6.65 1.5 13c0 8.5 11.5 17 11.5 17s11.5-8.5 11.5-17c0-6.35-5.15-11.5-11.5-11.5z" stroke="#ffffff" stroke-width="1.2"/>
          <circle cx="13" cy="12" r="5" fill="#ffffff"/>
          <circle cx="13" cy="12" r="3" fill="${pinColor}"/>
        </svg>
        <!-- Contacted Checkmark Badge -->
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

  // Uncontacted: Clean Subtle Slate Pin
  return `
    <div style="position: relative; width: 24px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.85;">
      <svg width="22" height="28" viewBox="0 0 26 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 1.5px 3px rgba(0,0,0,0.25)); transition: transform 0.15s ease;">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.75 13 19 13 19s13-9.25 13-19c0-7.18-5.82-13-13-13z" fill="#94a3b8"/>
        <circle cx="13" cy="12" r="4.5" fill="#ffffff"/>
      </svg>
    </div>
  `;
}

// Function to generate clean Cluster bubble
function createClusterIcon(count: number) {
  let size = 36;
  let bgGradient = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  let shadow = 'rgba(59, 130, 246, 0.4)';

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

export default function CustomerMapInner({ initialCustomers }: CustomerMapInnerProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [contactFilter, setContactFilter] = useState<'ALL' | 'CONTACTED' | 'UNCONTACTED'>('ALL');
  const [showZones, setShowZones] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDrawer, setShowDrawer] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const selectedMarkerLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const superclusterRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);

  // Summary counts of contacted vs uncontacted
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

  // Generate District Zones automatically from customer points
  const districtZones = useMemo(() => {
    return generateDistrictZones(customers, 5);
  }, [customers]);

  // Extract unique districts
  const districts = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.district && c.district.trim()) {
        set.add(c.district.trim());
      }
    });
    return Array.from(set).sort();
  }, [customers]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
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
  }, [customers, selectedDistrict, selectedStage, contactFilter, searchQuery]);

  // Build Supercluster index whenever filteredCustomers change
  useEffect(() => {
    const points = filteredCustomers.map((c) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        customer: c,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [c.longitude!, c.latitude!],
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
  }, [filteredCustomers]);

  // Fly to customer
  const flyToCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    if (mapInstanceRef.current && customer.latitude && customer.longitude) {
      mapInstanceRef.current.flyTo([customer.latitude, customer.longitude], 16, {
        duration: 0.8,
      });
    }
  }, []);

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
              // Show multi-factory picker popup for tight coordinates
              const leaves = superclusterRef.current.getLeaves(clusterId, 30);
              let leavesHtml = `
                <div style="font-family: inherit; min-width: 240px; max-width: 290px; max-height: 260px; overflow-y: auto; padding: 2px;">
                  <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
                    🏭 มี ${leaves.length} โรงงานในบริเวณนี้
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
              `;
              leaves.forEach((l: any) => {
                const c: Customer = l.properties.customer;
                leavesHtml += `
                  <div id="leaf-select-${c.id}" style="padding: 6px 8px; border-radius: 8px; background: #f8fafc; border: 1px solid #cbd5e1; cursor: pointer; transition: background 0.15s ease;">
                    <div style="font-size: 12px; font-weight: 700; color: #1e293b;">#${c.seq || c.id} ${c.name}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">📞 ${c.phone || '-'} • <span style="color: #2563eb; font-weight: 600;">${c.pipeline_stage || 'ยังไม่ได้ติดต่อ'}</span></div>
                  </div>
                `;
              });
              leavesHtml += `</div></div>`;

              L.popup().setLatLng([lat, lng]).setContent(leavesHtml).openOn(map);

              setTimeout(() => {
                leaves.forEach((l: any) => {
                  const c: Customer = l.properties.customer;
                  const el = document.getElementById(`leaf-select-${c.id}`);
                  if (el) {
                    el.onclick = () => {
                      map.closePopup();
                      flyToCustomer(c);
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
          // Single Customer Marker
          const cust: Customer = feature.properties.customer;

          // Skip if this is the selected customer (avoid duplicate rendering over selectedMarkerLayer)
          if (selectedCustomer && cust.id === selectedCustomer.id) {
            return;
          }

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
              ${cust.email ? `
                <div style="font-size: 11px; color: #2563eb; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; word-break: break-all;">
                  ✉️ <a href="mailto:${cust.email}" style="color: #2563eb; text-decoration: underline;">${cust.email}</a>
                </div>
              ` : ''}
              <a href="${getDbdSearchUrl(cust.name)}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 10px; margin-top: 6px; border-radius: 8px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #334155; text-decoration: none; cursor: pointer;">
                <span>🏛️ ดูข้อมูล DBD / งบการเงิน</span>
                <span style="font-size: 10px; color: #64748b;">↗</span>
              </a>
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
          });

          marker.on('popupopen', () => {
            setSelectedCustomer(cust);
            const btn = document.getElementById(`btn-details-${cust.id}`);
            if (btn) {
              btn.onclick = () => {
                setSelectedCustomer(cust);
                setIsModalOpen(true);
              };
            }
          });

          markersGroup.addLayer(marker);
        }
      });
    });
  }, [selectedCustomer, flyToCustomer]);


  // Dedicated Highlight Layer for Selected Customer
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedMarkerLayerRef.current) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default || leaflet;
      const layer = selectedMarkerLayerRef.current;
      layer.clearLayers();

      if (!selectedCustomer || !selectedCustomer.latitude || !selectedCustomer.longitude) return;

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
          ${selectedCustomer.latest_activity?.details ? `
            <div style="font-size: 11px; color: #065f46; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 4px 6px; margin-bottom: 6px; line-height: 1.3;">
              💬 <b>ล่าสุด (${selectedCustomer.latest_activity.activity_type}):</b> ${selectedCustomer.latest_activity.details.slice(0, 60)}...
            </div>
          ` : ''}
          ${selectedCustomer.phone ? `
            <div style="font-size: 12px; color: #475569; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
              📞 <b>${selectedCustomer.phone}</b>
            </div>
          ` : ''}
          ${selectedCustomer.email ? `
            <div style="font-size: 11px; color: #2563eb; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; word-break: break-all;">
              ✉️ <a href="mailto:${selectedCustomer.email}" style="color: #2563eb; text-decoration: underline;">${selectedCustomer.email}</a>
            </div>
          ` : ''}
          <a href="${getDbdSearchUrl(selectedCustomer.name)}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 10px; margin-top: 6px; border-radius: 8px; background: #f8fafc; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 700; color: #334155; text-decoration: none; cursor: pointer;">
            <span>🏛️ ดูข้อมูล DBD / งบการเงิน</span>
            <span style="font-size: 10px; color: #64748b;">↗</span>
          </a>
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
            setIsModalOpen(true);
          };
        }
      });

      layer.addLayer(marker);
      marker.openPopup();
    });
  }, [selectedCustomer]);

  // Draw or clear District Zones
  const renderDistrictZones = useCallback(() => {
    if (!mapInstanceRef.current || !zonesLayerRef.current) return;

    import('leaflet').then((leaflet) => {
      const L = leaflet.default || leaflet;
      const zonesGroup = zonesLayerRef.current;
      zonesGroup.clearLayers();

      if (!showZones) return;

      districtZones.forEach((zone) => {
        // Draw dashed zone polygon
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

        // Draw Zone Center Tag Badge
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

      // Clean OpenStreetMap Tiles (100% Free, no watermark, full Thai names)
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

      // Re-cluster on map move / zoom
      map.on('moveend', () => {
        renderClusteredMarkers();
      });

      // Initial render of zones
      renderDistrictZones();
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Zones when showZones or districtZones changes
  useEffect(() => {
    renderDistrictZones();
  }, [renderDistrictZones]);

  // ResizeObserver & showDrawer sync
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

              // Remove previous user marker if exists
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

  // Summary counts
  const stageStats = useMemo(() => {
    const counts: Record<string, number> = {};
    customers.forEach((c) => {
      const stage = c.pipeline_stage || 'ยังไม่ได้ติดต่อ';
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [customers]);

  return (
    <div className="relative w-full h-[calc(100dvh-3.5rem)] sm:h-[calc(100vh-4rem)] flex overflow-hidden bg-slate-100">
      
      {/* Map Container */}
      <div className="flex-1 relative h-full">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top Control Bar Overlay */}
        <div className="absolute top-2.5 sm:top-4 left-2.5 sm:left-4 right-2.5 sm:right-4 z-20 flex flex-col gap-1.5 pointer-events-none">
          
          {/* Top Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 pointer-events-auto">
            {/* Search Box */}
            <div className="flex-1 bg-white/95 backdrop-blur-md shadow-md rounded-2xl border border-slate-200/80 p-1.5 flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
              <input
                type="text"
                placeholder="ค้นหาโรงงาน, เบอร์, สินค้า..."
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

            {/* Quick Contact Status Filter Pills (Mobile & Desktop) */}
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
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>ยังไม่ได้ติดต่อ</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 font-semibold">
                  {statsSummary.uncontacted}
                </span>
              </button>
            </div>

            {/* Desktop-only dropdowns */}
            <div className="hidden sm:flex items-center gap-1.5">
              {/* District Filter Dropdown */}
              <div className="bg-white/95 backdrop-blur shadow-md rounded-xl border border-slate-200/80 p-1.5 flex items-center">
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

              {/* Pipeline Stage Filter Dropdown */}
              <div className="bg-white/95 backdrop-blur shadow-md rounded-xl border border-slate-200/80 p-1.5 flex items-center">
                <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer pr-2"
                >
                  <option value="ALL">ทุกสถานะ Pipeline</option>
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.stage} ({stageStats[s.stage] || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Quick Zone Chips Bar (Horizontal Scroll on Mobile & Desktop) */}
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
              {filteredCustomers.length}
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

        {/* Floating Selected Customer Action Card on Mobile (Bottom Card) */}
        {selectedCustomer && !showDrawer && (
          <div className="sm:hidden fixed bottom-16 left-2.5 right-2.5 z-30 bg-white/95 backdrop-blur-md rounded-2xl p-3.5 border border-slate-200 shadow-2xl animate-slide-up space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">
                    #{selectedCustomer.seq || selectedCustomer.id}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {selectedCustomer.district || 'สมุทรปราการ'}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                  {selectedCustomer.name}
                </h4>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contact Status Summary Banner */}
            {(selectedCustomer.activities_count !== undefined && selectedCustomer.activities_count > 0) || (selectedCustomer.pipeline_stage && selectedCustomer.pipeline_stage !== 'ยังไม่ได้ติดต่อ') ? (
              <div className="space-y-1 bg-emerald-50/90 border border-emerald-200 rounded-xl p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1 font-bold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ติดต่อแล้ว {selectedCustomer.activities_count || 1} ครั้ง</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    {selectedCustomer.pipeline_stage || 'ติดต่อแล้ว'}
                  </span>
                </div>
                {selectedCustomer.latest_activity?.details && (
                  <p className="text-[11px] text-emerald-900 line-clamp-1 italic">
                    💬 ล่าสุด ({selectedCustomer.latest_activity.activity_type}): {selectedCustomer.latest_activity.details}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-500">
                <span>⚪ ยังไม่เคยติดต่อ</span>
                <span className="text-[10px] text-slate-400">กดปุ่มโทรหรือบันทึกเพื่อเริ่มงาน</span>
              </div>
            )}

            {/* DBD Quick Link */}
            <a
              href={getDbdSearchUrl(selectedCustomer.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 transition-colors touch-press"
            >
              <span className="flex items-center space-x-1.5">
                <span>🏛️</span>
                <span>ดูข้อมูลนิติบุคคล DBD / งบการเงิน</span>
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* Quick Action Buttons Grid on Mobile Card */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
              {selectedCustomer.phone ? (
                <a
                  href={`tel:${selectedCustomer.phone.replace(/\s+/g, '')}`}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold touch-press"
                >
                  <Phone className="w-3.5 h-3.5 mb-0.5 text-emerald-600" />
                  <span>โทร</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 text-slate-300 text-[10px]">
                  <Phone className="w-3.5 h-3.5 mb-0.5" />
                  <span>ไม่มีเบอร์</span>
                </div>
              )}

              {selectedCustomer.email ? (
                <a
                  href={`mailto:${selectedCustomer.email.trim()}`}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[10px] font-bold touch-press"
                >
                  <Mail className="w-3.5 h-3.5 mb-0.5 text-indigo-600" />
                  <span>ส่งเมล</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 text-slate-300 text-[10px]">
                  <Mail className="w-3.5 h-3.5 mb-0.5" />
                  <span>ไม่มีเมล</span>
                </div>
              )}

              {selectedCustomer.google_maps_url ? (
                <a
                  href={selectedCustomer.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 text-[10px] font-bold touch-press"
                >
                  <ExternalLink className="w-3.5 h-3.5 mb-0.5 text-blue-600" />
                  <span>นำทาง</span>
                </a>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50 text-slate-300 text-[10px]">
                  <ExternalLink className="w-3.5 h-3.5 mb-0.5" />
                  <span>ไม่มีพิกัด</span>
                </div>
              )}

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-blue-600 text-white shadow-xs text-[10px] font-bold touch-press"
              >
                <Edit className="w-3.5 h-3.5 mb-0.5" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Bottom Legend / Pipeline Status Bar (Desktop only) */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md shadow-lg border border-slate-200/80 rounded-2xl p-3 hidden md:block max-w-xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>หมุดสถานะงานขาย & รวมกลุ่มอัจฉริยะ (Cluster)</span>
            <span>แสดง {filteredCustomers.length} / {customers.length} โรงงาน</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {PIPELINE_STAGES.map((s) => {
              const count = stageStats[s.stage] || 0;
              const isSelected = selectedStage === s.stage;
              return (
                <button
                  key={s.stage}
                  onClick={() => setSelectedStage(isSelected ? 'ALL' : s.stage)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${
                    isSelected
                      ? `${s.bg} ${s.color} ${s.border} ring-2 ring-blue-500`
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span>{s.stage}</span>
                  <span className="font-bold">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Customer List Drawer: Desktop Side Drawer & Mobile Bottom Sheet */}
      {showDrawer && (
        <div className="fixed sm:relative bottom-14 sm:bottom-0 left-0 sm:left-auto right-0 sm:right-auto max-h-[65vh] sm:max-h-full sm:h-full w-full sm:w-80 md:w-96 bg-white sm:border-l border-t sm:border-t-0 border-slate-200 shadow-2xl rounded-t-3xl sm:rounded-none flex flex-col z-40 sm:z-30 animate-slide-up sm:animate-in sm:slide-in-from-right duration-200">
          
          {/* Mobile Drag Handle */}
          <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Drawer Header */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                <span>รายชื่อโรงงาน</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  {filteredCustomers.length}
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">แตะเพื่อซูมดูตำแหน่งบนแผนที่</p>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Customer Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-600">ไม่พบโรงงานตามเงื่อนไข</p>
                <p className="text-xs text-slate-400">ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา</p>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const stageConf = getStageConfig(cust.pipeline_stage);
                const isSelected = selectedCustomer?.id === cust.id;

                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      flyToCustomer(cust);
                      // On mobile, keep selectedCustomer active so bottom card shows
                    }}
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
                          {(cust.activities_count !== undefined && cust.activities_count > 0) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              ✓ {cust.activities_count} กิจกรรม
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-600 text-white animate-pulse">
                              📍 กำลังเลือก
                            </span>
                          )}
                        </div>
                        <h4 className={`font-bold text-xs leading-snug truncate ${isSelected ? 'text-blue-950 font-extrabold' : 'text-slate-900'}`}>
                          {cust.name}
                        </h4>
                        {cust.latest_activity?.details ? (
                          <p className="text-[11px] text-emerald-800 truncate bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-100">
                            💬 {cust.latest_activity.activity_type}: {cust.latest_activity.details}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 truncate flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{cust.district || cust.address || 'สมุทรปราการ'}</span>
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(cust);
                          setIsModalOpen(true);
                        }}
                        className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600'
                        }`}
                        title="ดูรายละเอียดและอัปเดต"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {(cust.phone || cust.email) && (
                      <div className="mt-2 pt-2 border-t border-slate-100/80 space-y-1 text-[11px]">
                        {cust.phone && (
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
                        )}
                        {cust.email && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium truncate max-w-[180px]">✉️ {cust.email}</span>
                            <a
                              href={`mailto:${cust.email.trim()}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-600 font-semibold hover:underline shrink-0"
                            >
                              ส่งอีเมล
                            </a>
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

      {/* Customer Detail & Update Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCustomerUpdated={handleCustomerUpdated}
        onCustomerDeleted={handleCustomerDeleted}
      />

      {/* Create New Customer Modal */}
      <CustomerFormModal
        isOpen={isCreateModalOpen}
        customer={null}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={handleCustomerSaved}
      />

    </div>
  );
}
