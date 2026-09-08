import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now().toString(36)}`;
}

export function generateQuotationNumber(index: number = 1): string {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const seq = index.toString().padStart(4, '0');
  return `QT-${year}${month}-${seq}`;
}

export function getCleanCompanyName(name: string): string {
  if (!name) return '';
  let cleaned = name;

  // 1. Remove ISO / certifications suffixes after hyphen
  cleaned = cleaned.replace(/-\s*ISO[\w\s:.-]+/gi, '');
  cleaned = cleaned.replace(/-\s*FSC[\w\s:.-]+/gi, '');
  cleaned = cleaned.replace(/-\s*GMP[\w\s:.-]+/gi, '');
  cleaned = cleaned.replace(/-\s*HACCP[\w\s:.-]+/gi, '');

  // 2. If name contains " | ", pick the Thai corporate name part
  if (cleaned.includes(' | ')) {
    const parts = cleaned.split(' | ');
    const thaiPart = parts.find((p) => /[\u0E00-\u0E7F]/.test(p));
    if (thaiPart) cleaned = thaiPart;
    else cleaned = parts[0];
  }

  // 3. If name contains " - ", check if first part is a short acronym (<= 8 chars)
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    if (parts[0].trim().length <= 8 && parts.length > 1) {
      cleaned = parts.slice(1).join(' - ');
    }
  }

  // 4. Remove text inside parentheses (e.g. branch, english name, or descriptions)
  cleaned = cleaned.replace(/\(.*?\)/g, '');
  cleaned = cleaned.replace(/\[.*?\]/g, '');

  // 5. Trim extra symbols & whitespace
  cleaned = cleaned.replace(/[,;]/g, ' ').replace(/\s+/g, ' ').trim();

  return cleaned || name.trim();
}

/**
 * Returns DBD direct profile link (by 13-digit tax_id) or smart Google DBD search link
 */
export function getDbdSearchUrl(customerOrName: { name?: string; tax_id?: string | null; registered_name?: string | null } | string): string {
  if (typeof customerOrName === 'string') {
    const clean = getCleanCompanyName(customerOrName);
    return `https://www.google.com/search?q=${encodeURIComponent(clean + ' กรมพัฒนาธุรกิจการค้า DBD')}`;
  }

  const taxId = customerOrName?.tax_id?.trim();
  if (taxId && taxId.length >= 10) {
    return `https://datawarehouse.dbd.go.th/company/profile/${taxId}`;
  }

  const nameToSearch = customerOrName?.registered_name?.trim() || customerOrName?.name || '';
  const clean = getCleanCompanyName(nameToSearch);
  return `https://www.google.com/search?q=${encodeURIComponent(clean + ' กรมพัฒนาธุรกิจการค้า DBD')}`;
}

/**
 * Returns Google DBD DataWarehouse search query URL
 */
export function getGoogleDbdSearchUrl(customerOrName: { name?: string; tax_id?: string | null; registered_name?: string | null } | string): string {
  return getDbdSearchUrl(customerOrName);
}
