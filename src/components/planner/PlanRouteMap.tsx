'use client';

import React, { useEffect, useRef } from 'react';
import { SalesPlanItem } from '@/types/planner';

interface PlanRouteMapProps {
  items: SalesPlanItem[];
}

export default function PlanRouteMap({ items }: PlanRouteMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const itemsWithCoords = items.filter(
    (it) => it.customer && it.customer.latitude && it.customer.longitude
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;

    import('leaflet').then((leaflet) => {
      if (!isMounted || !mapContainerRef.current) return;
      const L = leaflet.default || leaflet;

      // Fix Leaflet's default icon assets
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [13.5991, 100.5968], // Samut Prakan Center
          zoom: 11,
          zoomControl: false,
        });

        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          {
            attribution: '© OpenStreetMap, © CARTO',
            maxZoom: 19,
          }
        ).addTo(map);

        L.control.zoom({ position: 'topright' }).addTo(map);

        const group = L.layerGroup().addTo(map);
        layerGroupRef.current = group;
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const group = layerGroupRef.current;
      if (!map || !group) return;

      group.clearLayers();

      if (itemsWithCoords.length === 0) {
        map.setView([13.5991, 100.5968], 11);
        return;
      }

      const latLngs: [number, number][] = [];

      itemsWithCoords.forEach((it, idx) => {
        const lat = Number(it.customer!.latitude);
        const lng = Number(it.customer!.longitude);
        latLngs.push([lat, lng]);

        const iconHtml = `
          <div style="position: relative; width: 34px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));">
              <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="#148277"/>
              <path d="M16 2C8.268 2 2 8.268 2 16c0 10.5 14 21 14 21s14-10.5 14-21c0-7.732-6.268-14-14-14z" fill="#1b9b8e"/>
              <circle cx="16" cy="15" r="9" fill="#ffffff"/>
            </svg>
            <div style="
              position: absolute;
              top: 7px;
              left: 50%;
              transform: translateX(-50%);
              font-size: 11px;
              font-weight: 900;
              color: #0f172a;
            ">
              ${idx + 1}
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'plan-marker-icon',
          html: iconHtml,
          iconSize: [34, 42],
          iconAnchor: [17, 42],
          popupAnchor: [0, -38],
        });

        const marker = L.marker([lat, lng], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <div style="font-weight: 800; color: #148277; margin-bottom: 2px;">Stop #${idx + 1}</div>
            <div style="font-weight: 700; color: #0f172a;">${it.customer?.name}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">📍 ${it.customer?.district || 'Samut Prakan'}</div>
            ${it.objective ? `<div style="margin-top: 4px; padding: 4px; background: #f8fafc; border-radius: 6px; font-size: 10px; color: #334155;">🎯 ${it.objective}</div>` : ''}
          </div>
        `);

        group.addLayer(marker);
      });

      // Draw dashed connecting polyline for route
      if (latLngs.length > 1) {
        const polyline = L.polyline(latLngs, {
          color: '#1b9b8e',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '8, 8',
        });
        group.addLayer(polyline);
      }

      // Fit bounds
      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [itemsWithCoords]);

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[320px] sm:h-[400px]">
      <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <span>🗺️ Daily Travel & Route Map</span>
          <span className="px-2 py-0.2 rounded-full bg-teal-100 text-[#148277] text-[10px] font-extrabold">
            {itemsWithCoords.length} Destinations
          </span>
        </span>
      </div>

      <div className="flex-1 w-full relative">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
