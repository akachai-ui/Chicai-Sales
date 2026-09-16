'use client';

const PORTFOLIO_STORAGE_KEY = 'chicai_my_portfolio_customer_ids';
const PORTFOLIO_EVENT_NAME = 'chicai_portfolio_updated';

/**
 * Get all customer IDs in the user's portfolio
 */
export function getMyPortfolioIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => Number(id)).filter((id) => !isNaN(id)) : [];
  } catch (e) {
    console.error('Error reading portfolio IDs from localStorage:', e);
    return [];
  }
}

/**
 * Check if a customer is in the user's portfolio
 */
export function isCustomerInPortfolio(
  target: number | string | { id?: number | string; crm_id?: number } | undefined | null,
  portfolioIds?: number[]
): boolean {
  if (!target) return false;
  let idVal: any = target;
  if (typeof target === 'object') {
    idVal = target.id ?? target.crm_id;
  }
  if (typeof idVal === 'string') {
    idVal = parseInt(idVal.replace('crm_', ''), 10);
  }
  if (typeof idVal !== 'number' || isNaN(idVal)) return false;
  
  const list = portfolioIds || getMyPortfolioIds();
  return list.includes(idVal);
}

/**
 * Add one or more customers to the portfolio
 */
export function addToPortfolio(customerIds: number | number[]): number[] {
  if (typeof window === 'undefined') return [];
  const current = getMyPortfolioIds();
  const toAdd = Array.isArray(customerIds) ? customerIds : [customerIds];
  
  const updatedSet = new Set([...current, ...toAdd]);
  const result = Array.from(updatedSet);
  
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(result));
    window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT_NAME, { detail: { portfolioIds: result } }));
  } catch (e) {
    console.error('Error saving portfolio IDs:', e);
  }
  return result;
}

/**
 * Remove a customer from the portfolio
 */
export function removeFromPortfolio(customerId: number): number[] {
  if (typeof window === 'undefined') return [];
  const current = getMyPortfolioIds();
  const result = current.filter((id) => id !== customerId);
  
  try {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(result));
    window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT_NAME, { detail: { portfolioIds: result } }));
  } catch (e) {
    console.error('Error removing portfolio ID:', e);
  }
  return result;
}

/**
 * Toggle a customer in/out of the portfolio
 */
export function togglePortfolio(customerId: number): boolean {
  if (typeof window === 'undefined') return false;
  if (isCustomerInPortfolio(customerId)) {
    removeFromPortfolio(customerId);
    return false;
  } else {
    addToPortfolio(customerId);
    return true;
  }
}

/**
 * Subscribe to portfolio changes across components
 */
export function subscribeToPortfolioChanges(callback: (portfolioIds: number[]) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && Array.isArray(customEvent.detail.portfolioIds)) {
      callback(customEvent.detail.portfolioIds);
    } else {
      callback(getMyPortfolioIds());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === PORTFOLIO_STORAGE_KEY) {
      callback(getMyPortfolioIds());
    }
  };

  window.addEventListener(PORTFOLIO_EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(PORTFOLIO_EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
