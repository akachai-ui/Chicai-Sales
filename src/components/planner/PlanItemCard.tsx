'use client';

import React from 'react';
import { SalesPlanItem, PLAN_ACTIVITY_CONFIGS, PlanActivityType } from '@/types/planner';
import {
  MapPin,
  Phone,
  Clock,
  Target,
  ChevronUp,
  ChevronDown,
  Trash2,
  Navigation,
  User,
  CheckCircle2,
  FileText,
} from 'lucide-react';

interface PlanItemCardProps {
  item: SalesPlanItem;
  index: number;
  totalItems: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  onUpdateStatus?: (status: string) => void;
  onLogReport?: () => void;
}

export default function PlanItemCard({
  item,
  index,
  totalItems,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdateStatus,
  onLogReport,
}: PlanItemCardProps) {
  const customer = item.customer;
  const activityConfig =
    PLAN_ACTIVITY_CONFIGS[item.activity_type as PlanActivityType] ||
    PLAN_ACTIVITY_CONFIGS.VISIT;

  const isCompleted = item.status === 'COMPLETED';

  return (
    <div
      className={`bg-white rounded-2xl border transition-all p-4 space-y-3 relative group ${
        isCompleted
          ? 'border-emerald-200 bg-emerald-50/20 shadow-xs'
          : 'border-slate-200 shadow-xs hover:shadow-md hover:border-teal-200'
      }`}
    >
      {/* Top Bar: Sequence # + Activity Tag + Time + Move Buttons */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
          {/* Sequence Number Badge */}
          <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shadow-xs">
            {index + 1}
          </div>

          {/* Activity Type Badge */}
          <span
            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${activityConfig.bg} ${activityConfig.color} ${activityConfig.border}`}
          >
            <span>{activityConfig.emoji}</span>
            <span>{activityConfig.label}</span>
          </span>

          {/* Scheduled Time */}
          {item.scheduled_time && (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{item.scheduled_time}</span>
            </span>
          )}
        </div>

        {/* Action controls: Move Up/Down + Delete */}
        <div className="flex items-center space-x-1">
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100"
              title="Move Up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              disabled={index === totalItems - 1}
              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded-lg hover:bg-slate-100"
              title="Move Down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
              title="Remove from Today's Plan"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Factory Name & Details */}
      <div className="space-y-1">
        <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
          {customer?.name || 'Scheduled Factory'}
        </h4>

        <div className="flex items-center space-x-3 text-xs text-slate-500 flex-wrap gap-y-1">
          <p className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{customer?.district || customer?.address || 'Samut Prakan'}</span>
          </p>

          {(item.contact_person || customer?.contact_person) && (
            <p className="flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700">
                {item.contact_person || customer?.contact_person}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Objective / Discussion Topic */}
      {item.objective && (
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-1">
          <div className="flex items-center space-x-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <Target className="w-3 h-3 text-[#1b9b8e]" />
            <span>Objective & Discussion</span>
          </div>
          <p className="font-medium text-slate-800">{item.objective}</p>
        </div>
      )}

      {/* Bottom Row Action Links */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center space-x-2">
          {customer?.phone && (
            <a
              href={`tel:${customer.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Call {customer.phone}</span>
            </a>
          )}

          {(customer?.google_maps_url || (customer?.latitude && customer?.longitude)) && (
            <a
              href={
                customer.google_maps_url ||
                `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#148277] text-xs font-bold transition-all"
            >
              <Navigation className="w-3.5 h-3.5 text-[#1b9b8e]" />
              <span>GPS Navigation</span>
            </a>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onLogReport && (
            <button
              onClick={onLogReport}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Log Visit Report</span>
            </button>
          )}

          {onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(isCompleted ? 'PENDING' : 'COMPLETED')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isCompleted
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Completed' : 'Mark Complete'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
