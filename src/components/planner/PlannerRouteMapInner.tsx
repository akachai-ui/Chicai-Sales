'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PlannedStop } from '@/types/planner';
import { calculateDistanceKm, formatDistanceThai, estimateDrivingTimeMinutes, formatDrivingTimeThai } from '@/lib/geo-distance';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Car, Locate } from 'lucide-react';

interface PlannerRouteMapInnerProps {
  stops: PlannedStop[];
  onSelectStop?: (stop: PlannedStop) => void;
}

export default function PlannerRouteMapInner({ stops, onSelectStop }: PlannerRouteMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [13.7563, 100.5018],
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

    const lg = L.layerGroup().addTo(map);
    layerGroupRef.current = lg;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Get current user GPS location
  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 14, { duration: 1.2 });
        }
      },
      (err) => {
        console.warn('Geolocation error:', err);
      },
      { enableHighAccuracy: true }
    );
  };

  // Render stops, markers, polylines and distance badges
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

    // Render numbered markers
    validStops.forEach((stop, index) => {
      const lat = stop.latitude!;
      const lng = stop.longitude!;
      const num = index + 1;
      latLngs.push([lat, lng]);

      const isCompleted = stop.status === 'COMPLETED';
      const isInProgress = stop.status === 'IN_PROGRESS';

      const pinBg = isCompleted ? '#059669' : isInProgress ? '#2563eb' : '#0f172a';
      const ringColor = isCompleted ? '#34d399' : isInProgress ? '#60a5fa' : '#f59e0b';

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
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              background: ${pinBg};
              border: 2px solid #ffffff;
              box-shadow: 0 4px 10px rgba(0,0,0,0.35);
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <span style="
                transform: rotate(45deg);
                color: #ffffff;
                font-size: 13px;
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

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(lg);

      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 2px; min-width: 180px;">
          <div style="font-weight: 800; color: #0f172a; font-size: 13px; margin-bottom: 3px;">
            ${num}. ${stop.companyName}
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
  }, [stops, userLocation, onSelectStop]);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: '320px' }} />

      {/* GPS Locate Button */}
      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute top-3 right-3 z-10 p-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95 touch-press"
        title="หาตำแหน่ง GPS ปัจจุบัน"
      >
        <Locate className="w-4 h-4 text-blue-600" />
        <span className="hidden sm:inline">ตำแหน่งของฉัน</span>
      </button>
    </div>
  );
}
