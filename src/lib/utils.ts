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
  // If format like "SCMP - บจก. สหะเจริญ..." extract the Thai/full company name
  if (name.includes(' - ')) {
    const parts = name.split(' - ');
    return parts[parts.length - 1].trim();
  }
  return name.trim();
}

export function getDbdSearchUrl(companyName: string): string {
  const clean = getCleanCompanyName(companyName);
  return `https://data.creden.co/search?q=${encodeURIComponent(clean)}`;
}

export function getDbdOfficialUrl(companyName: string): string {
  const clean = getCleanCompanyName(companyName);
  return `https://www.google.com/search?q=${encodeURIComponent(clean + ' กรมพัฒนาธุรกิจการค้า dbd datawarehouse')}`;
}
