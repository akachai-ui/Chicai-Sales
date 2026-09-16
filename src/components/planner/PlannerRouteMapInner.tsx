'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { PlannedStop } from '@/types/planner';
import { Customer } from '@/types/customer';
import { supabase } from '@/lib/supabase';
import {
  calculateDistanceKm,
  formatDistanceThai,
  estimateDrivingTimeMinutes,
} from '@/lib/geo-distance';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Car, Locate, Building2, Plus, Check, Eye, Star } from 'lucide-react';
import { getPortfolioCustomerIds, isCustomerInPortfolio } from '@/lib/portfolio-storage';

interface PlannerRouteMapInnerProps {
  stops: PlannedStop[];
  onSelectStop?: (stop: PlannedStop) => void;
  onAddCustomer?: (customer: Customer) => void;
  selectedDate?: string;
}

export default function PlannerRouteMapInner({
  stops,
  onSelectStop,
  onAddCustomer,
  selectedDate,
}: PlannerRouteMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const candidateLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [portfolioIds, setPortfolioIds] = useState<number[]>([]);
  const [showOnlyPortfolio, setShowOnlyPortfolio] = useState(true);
  const [showCandidatePins, setShowCandidatePins] = useState(true);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Load portfolio IDs
  useEffect(() => {
    setPortfolioIds(getPortfolioCustomerIds());
  }, []);

  // 1. Fetch available customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, address, district, province, google_maps_url, latitude, longitude, contact_person, target_product, pipeline_stage, activities_count')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(500);

        if (!error && data) {
          setAllCustomers(data as Customer[]);
        }
      } catch (err) {
        console.error('Error fetching customers for planner map:', err);
      }
    };

    fetchCustomers();
  }, []);

  // 2. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [13.58, 100.65], // Samut Prakan / Bangkok Industrial center
      zoom: 10,
      zoomControl: false,
    });

    // Add zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const candLg = L.layerGroup().addTo(map);
    const routeLg = L.layerGroup().addTo(map);
    candidateLayerGroupRef.current = candLg;
    layerGroupRef.current = routeLg;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Get current user GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 13, { duration: 1.2 });
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true }
    );
  };

  // 4. Render candidate factory pins (Available factories not yet in plan)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const candLg = candidateLayerGroupRef.current;
    if (!map || !candLg) return;

    candLg.clearLayers();

    // Filter candidate customers based on portfolio focus & plan exclusion
    const plannedCustomerIds = new Set(
      stops.map((s) => s.customerId).filter(Boolean)
    );
    const plannedNames = new Set(
      stops.map((s) => s.companyName.trim().toLowerCase())
    );

    const candidatePool = allCustomers.filter((cust) => {
      if (!cust.latitude || !cust.longitude) return false;
      const isAlreadyInPlan =
        plannedCustomerIds.has(cust.id) ||
        plannedNames.has(cust.name.trim().toLowerCase());
      if (isAlreadyInPlan) return false;

      const inPort = isCustomerInPortfolio(cust, portfolioIds);
      if (showOnlyPortfolio && !inPort) return false;

      return true;
    });

    candidatePool.forEach((cust) => {
      if (!cust.latitude || !cust.longitude) return;
      const inPort = isCustomerInPortfolio(cust, portfolioIds);

      const candidateIcon = L.divIcon({
        className: 'candidate-factory-pin',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="
              width: ${inPort ? '24px' : '20px'};
              height: ${inPort ? '24px' : '20px'};
              border-radius: 50%;
              background: ${inPort ? '#fffbeb' : '#f8fafc'};
              border: 2px solid ${inPort ? '#f59e0b' : '#3b82f6'};
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: ${inPort ? '12px' : '10px'};
            ">
              ${inPort ? '⭐' : '🏢'}
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14],
      });

      const marker = L.marker([cust.latitude, cust.longitude], {
        icon: candidateIcon,
        zIndexOffset: inPort ? 150 : 100,
      }).addTo(candLg);

      const popupHtml = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 2px; min-width: 220px; max-width: 270px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
            <div style="font-size: 10.5px; font-weight: 700; color: #64748b;">
              📍 ${cust.district ? `${cust.district}, ` : ''}${cust.province || 'สมุทรปราการ'}
            </div>
            ${inPort ? `
              <span style="background: #fef3c7; color: #92400e; font-size: 9.5px; font-weight: 800; padding: 1px 6px; border-radius: 9999px; border: 1px solid #fcd34d;">
                ⭐ ในพอร์ต
              </span>
            ` : ''}
          </div>
          <div style="font-weight: 800; color: #0f172a; font-size: 13px; margin-bottom: 4px;">
            ${cust.name}
          </div>
          ${cust.contact_person ? `<div style="color: #334155; font-size: 11px;">👤 คุณ${cust.contact_person}</div>` : ''}
          ${cust.phone ? `<div style="color: #059669; font-weight: 700; font-size: 11px; margin-top: 2px;">📞 ${cust.phone}</div>` : ''}
          <div style="margin-top: 8px;">
            <button
              id="btn-add-map-stop-${cust.id}"
              style="
                width: 100%;
                padding: 7px 10px;
                background: ${inPort ? 'linear-gradient(135deg, #d97706, #b45309)' : 'linear-gradient(135deg, #2563eb, #4f46e5)'};
                color: #ffffff;
                border: none;
                border-radius: 9px;
                font-size: 11.5px;
                font-weight: 800;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.25);
              "
            >
              🚗 + เพิ่มเข้าแผนงาน (จุดที่ #${stops.length + 1})
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-add-map-stop-${cust.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            if (onAddCustomer) {
              onAddCustomer(cust);
              setAddedToast(`✅ เพิ่ม ${cust.name} เป็นจุดหมายที่ #${stops.length + 1} เรียบร้อยแล้ว!`);
              setTimeout(() => setAddedToast(null), 3000);
              map.closePopup();
            }
          };
        }
      });
    });
  }, [allCustomers, showCandidatePins, showOnlyPortfolio, portfolioIds, stops, onAddCustomer]);

  // 5. Render active route stops, markers, polylines and distance badges
  useEffect(() => {
    const map = mapInstanceRef.current;
    const lg = layerGroupRef.current;
    if (!map || !lg) return;

    lg.clearLayers();

    // Valid stops with coordinates
    const validStops = stops.filter(
      (s) => s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude)
    );

    const latLngs: L.LatLngExpression[] = [];

    // Render numbered route markers
    validStops.forEach((stop, index) => {
      const lat = stop.latitude!;
      const lng = stop.longitude!;
      const num = index + 1;
      latLngs.push([lat, lng]);

      const isCompleted = stop.status === 'COMPLETED';
      const isInProgress = stop.status === 'IN_PROGRESS';

      const pinBg = isCompleted ? '#059669' : isInProgress ? '#2563eb' : '#0f172a';

      const customIcon = L.divIcon({
        className: 'route-stop-pin',
        html: `
          <div style="position: relative; width: 38px; height: 48px; display: flex; align-items: flex-end; justify-content: center; cursor: pointer;">
            ${
              isInProgress
                ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; border: 2.5px solid #2563eb; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>`
                : ''
            }
            <div style="
              width: 34px;
              height: 34px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              background: ${pinBg};
              border: 2.5px solid #ffffff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="
                transform: rotate(45deg);
                color: #ffffff;
                font-size: 13.5px;
                font-weight: 900;
                font-family: sans-serif;
              ">${num}</span>
            </div>
          </div>
        `,
        iconSize: [38, 48],
        iconAnchor: [19, 42],
        popupAnchor: [0, -40],
      });

      const marker = L.marker([lat, lng], {
        icon: customIcon,
        zIndexOffset: 1000 + index,
      }).addTo(lg);

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 2px; min-width: 190px;">
          <div style="font-weight: 800; color: #0f172a; font-size: 13px; margin-bottom: 3px;">
            จุดหมายที่ ${num}: ${stop.companyName}
          </div>
          ${stop.plannedTime ? `<div style="color: #2563eb; font-weight: 700; font-size: 11px;">⏰ เวลา ${stop.plannedTime} น.</div>` : ''}
          <div style="color: #475569; font-size: 11px; margin-top: 2px;">📍 ${stop.district || ''} ${stop.province || ''}</div>
          <div style="color: #0369a1; font-weight: 600; font-size: 11px; margin-top: 3px;">🎯 ${stop.objective}</div>
          ${stop.phone ? `<div style="margin-top: 4px;"><a href="tel:${stop.phone}" style="color: #059669; font-weight: 700; text-decoration: none;">📞 ${stop.phone}</a></div>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);

      if (onSelectStop) {
        marker.on('click', () => onSelectStop(stop));
      }
    });

    // Draw Polylines and Mid-point distance badges
    if (latLngs.length > 1) {
      // Glow polyline
      L.polyline(latLngs, {
        color: '#60a5fa',
        weight: 8,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(lg);

      // Main dashed polyline
      L.polyline(latLngs, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.9,
        dashArray: '8, 8',
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(lg);

      // Mid-point distance indicators
      for (let i = 0; i < validStops.length - 1; i++) {
        const from = validStops[i];
        const to = validStops[i + 1];
        const distKm = calculateDistanceKm(from.latitude, from.longitude, to.latitude, to.longitude);

        if (distKm !== null) {
          const midLat = (from.latitude! + to.latitude!) / 2;
          const midLng = (from.longitude! + to.longitude!) / 2;
          const timeMin = estimateDrivingTimeMinutes(distKm);

          const distanceIcon = L.divIcon({
            className: 'distance-badge',
            html: `
              <div style="
                background: #0f172a;
                color: #ffffff;
                padding: 2px 7px;
                border-radius: 9999px;
                font-size: 10px;
                font-weight: 800;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                border: 1.5px solid #60a5fa;
                display: flex;
                align-items: center;
                gap: 3px;
                pointer-events: none;
                transform: translate(-50%, -50%);
              ">
                <span>🚗 ${formatDistanceThai(distKm)}</span>
                ${timeMin ? `<span style="color: #93c5fd; font-size: 9px;">(${timeMin}น.)</span>` : ''}
              </div>
            `,
            iconSize: [0, 0],
          });

          L.marker([midLat, midLng], { icon: distanceIcon }).addTo(lg);
        }
      }

      // Fit map bounds to show all stops nicely
      const bounds = L.latLngBounds(latLngs as [number, number][]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (latLngs.length === 1) {
      map.setView(latLngs[0], 12);
    } else if (allCustomers.length > 0 && !userLocation) {
      // If no stops yet, center on first batch of customers
      const firstWithCoords = allCustomers.find((c) => c.latitude && c.longitude);
      if (firstWithCoords && firstWithCoords.latitude && firstWithCoords.longitude) {
        map.setView([firstWithCoords.latitude, firstWithCoords.longitude], 10);
      }
    }

    // User GPS location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-gps-pin',
        html: `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 14px; height: 14px; border-radius: 9999px; background: #2563eb; border: 2.5px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker(userLocation, { icon: userIcon })
        .bindPopup('<b style="font-size: 11px;">📍 ตำแหน่งปัจจุบันของคุณ</b>')
        .addTo(lg);
    }
  }, [stops, userLocation, onSelectStop, allCustomers]);

  const portfolioCandidateCount = useMemo(() => {
    return allCustomers.filter((c) => isCustomerInPortfolio(c, portfolioIds)).length;
  }, [allCustomers, portfolioIds]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: '320px' }} />

      {/* Added Toast Alert */}
      {addedToast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 border border-emerald-500">
          {addedToast}
        </div>
      )}

      {/* Top Map Action Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex items-center space-x-1.5 flex-wrap gap-y-1">
        {/* Toggle Candidate Pins Mode */}
        <div className="flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-md border border-slate-200 space-x-1">
          <button
            type="button"
            onClick={() => {
              setShowCandidatePins(true);
              setShowOnlyPortfolio(true);
            }}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-black flex items-center space-x-1 transition-all ${
              showCandidatePins && showOnlyPortfolio
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-900 bg-amber-50 hover:bg-amber-100'
            }`}
            title="แสดงเฉพาะหมุดลูกค้าในพอร์ตโฟลิโอ"
          >
            <Star className={`w-3.5 h-3.5 ${showCandidatePins && showOnlyPortfolio ? 'fill-white text-white' : 'fill-amber-400 text-amber-500'}`} />
            <span>ในพอร์ต ({portfolioCandidateCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowCandidatePins(true);
              setShowOnlyPortfolio(false);
            }}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
              showCandidatePins && !showOnlyPortfolio
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="แสดงหมุดโรงงานทั้งหมด"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ทั้งหมด ({allCustomers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCandidatePins(!showCandidatePins)}
            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
              !showCandidatePins
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700'
            }`}
            title="ซ่อนหมุดโรงงานนอกแผนงาน"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* GPS Locate Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          className="p-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center space-x-1 transition-all active:scale-95 touch-press"
          title="หาตำแหน่ง GPS ปัจจุบัน"
        >
          <Locate className="w-4 h-4 text-blue-600" />
        </button>
      </div>

      {/* Bottom Map Helper Banner when 0 stops */}
      {stops.length === 0 && (
        <div className="absolute bottom-3 left-3 right-3 z-10 p-2.5 bg-white/95 backdrop-blur-xs rounded-xl border border-blue-200 shadow-md text-center text-xs font-bold text-blue-900 flex items-center justify-center space-x-2">
          <span>💡</span>
          <span>คลิกที่หมุดโรงงาน ⭐ ในพอร์ต หรือ 🏢 บนแผนที่เพื่อกดเพิ่มเข้าแผนงานของวันนี้ได้ทันที</span>
        </div>
      )}
    </div>
  );
}

