import { Customer } from '@/types/customer';

const PORTFOLIO_STORAGE_KEY = 'CHICAI_PORTFOLIO_CUSTOMER_IDS';

export function getPortfolioCustomerIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading portfolio ids from storage:', e);
  }
  return [];
}

export function savePortfolioCustomerIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch (e) {
    console.error('Error saving portfolio ids:', e);
  }
}

export function togglePortfolioCustomerId(customerId: number): boolean {
  if (!customerId || customerId <= 0) return false;
  const current = getPortfolioCustomerIds();
  const index = current.indexOf(customerId);
  let isNowIn = false;
  if (index >= 0) {
    current.splice(index, 1);
    isNowIn = false;
  } else {
    current.push(customerId);
    isNowIn = true;
  }
  savePortfolioCustomerIds(current);
  return isNowIn;
}

export function addPortfolioCustomerId(customerId: number): void {
  if (!customerId || customerId <= 0) return;
  const current = getPortfolioCustomerIds();
  if (!current.includes(customerId)) {
    current.push(customerId);
    savePortfolioCustomerIds(current);
  }
}

export function isCustomerInPortfolio(customer: Customer, savedPortfolioIds?: number[]): boolean {
  if (!customer) return false;
  const ids = savedPortfolioIds || getPortfolioCustomerIds();
  if (customer.id && ids.includes(customer.id)) {
    return true;
  }
  // Auto-qualify if customer has active engagement
  const stage = customer.pipeline_stage;
  const hasActiveStage =
    stage &&
    stage !== 'ยังไม่ได้ติดต่อ' &&
    stage !== 'ไม่สนใจ / ปิดการขายไม่ได้';

  const hasActivities = Boolean(
    customer.activities_count && customer.activities_count > 0
  );

  return Boolean(hasActiveStage || hasActivities);
}

export function getCustomerFollowUpStatus(
  customer: Customer,
  thresholdDays: number = 14
): {
  needsFollowUp: boolean;
  daysSinceLastActivity: number | null;
  label: string;
} {
  const lastDateStr = customer.latest_activity?.activity_date || customer.updated_at || customer.created_at;
  if (!lastDateStr) {
    return {
      needsFollowUp: true,
      daysSinceLastActivity: null,
      label: 'ยังไม่มีประวัติการติดต่อ',
    };
  }

  const lastTime = new Date(lastDateStr).getTime();
  const now = Date.now();
  const diffDays = Math.floor((now - lastTime) / (1000 * 60 * 60 * 24));

  if (diffDays >= thresholdDays) {
    return {
      needsFollowUp: true,
      daysSinceLastActivity: diffDays,
      label: `ไม่ได้ติดต่อมา ${diffDays} วัน`,
    };
  }

  return {
    needsFollowUp: false,
    daysSinceLastActivity: diffDays,
    label: `ติดต่อล่าสุด ${diffDays === 0 ? 'วันนี้' : `${diffDays} วันที่แล้ว`}`,
  };
}
