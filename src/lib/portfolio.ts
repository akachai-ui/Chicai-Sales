'use client';

import { supabase, fetchMyCustomers } from '@/lib/supabase';
import { MyCustomer } from '@/types/customer';

const PORTFOLIO_STORAGE_KEY = 'chicai_my_customers_cache';
const PORTFOLIO_EVENT_NAME = 'chicai_my_customers_updated';

/**
 * Get all cached my_customers from local storage
 */
export function getLocalMyCustomers(): MyCustomer[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading my_customers from localStorage:', e);
    return [];
  }
}

/**
 * Get all customer IDs in the user's portfolio (for quick lookup)
 */
export function getMyPortfolioIds(): number[] {
  const list = getLocalMyCustomers();
  return list.map((c) => c.id);
}

/**
 * Sync my_customers directly from Supabase database
 */
export async function syncMyCustomersFromSupabase(): Promise<MyCustomer[]> {
  if (typeof window === 'undefined') return [];
  try {
    const data = await fetchMyCustomers();
    if (data && Array.isArray(data)) {
      localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT_NAME, { detail: { myCustomers: data } }));
      return data as MyCustomer[];
    }
  } catch (e) {
    console.error('Error syncing my_customers from Supabase:', e);
  }
  return getLocalMyCustomers();
}

/**
 * Check if a factory or customer is already in my_customers table
 */
export function isFactoryInPortfolio(
  factory: any,
  myCustomersList?: MyCustomer[]
): boolean {
  if (!factory) return false;
  const list = myCustomersList || getLocalMyCustomers();

  // 1. Direct ID match if it's already a MyCustomer
  if (typeof factory === 'number') {
    return list.some((c) => c.id === factory || (c.source_type === 'CUSTOMERS' && c.source_id === factory));
  }

  const crmId = factory.crm_id || (factory.id && typeof factory.id === 'number' ? factory.id : null);
  const dbdId = factory.dbd_id;
  const factName = (factory.name || '').trim().toLowerCase();

  return list.some((c) => {
    if (crmId && c.source_type === 'CUSTOMERS' && c.source_id === crmId) return true;
    if (dbdId && c.source_type === 'DBD' && c.source_id === dbdId) return true;
    if (c.id === factory.id) return true;
    if (factName && c.name && c.name.trim().toLowerCase() === factName) return true;
    return false;
  });
}

// Backward-compatible alias
export const isCustomerInPortfolio = isFactoryInPortfolio;

/**
 * Add one or more factories/companies to my_customers in Supabase
 */
export async function addToMyCustomers(
  items: any | any[]
): Promise<MyCustomer[]> {
  const itemsArray = Array.isArray(items) ? items : [items];
  if (itemsArray.length === 0) return getLocalMyCustomers();

  const current = getLocalMyCustomers();
  const toInsert: any[] = [];

  for (const item of itemsArray) {
    if (isFactoryInPortfolio(item, current)) continue;

    const isDbd = Boolean(item.dbd_id && !item.crm_id);
    const source_type = isDbd ? 'DBD' : 'CUSTOMERS';
    const source_id = item.crm_id || (typeof item.id === 'number' ? item.id : item.dbd_id) || null;

    toInsert.push({
      name: item.name,
      phone: item.phone || null,
      email: item.email || null,
      address: item.address || null,
      district: item.district || null,
      province: item.province || 'สมุทรปราการ',
      latitude: item.latitude || null,
      longitude: item.longitude || null,
      website: item.website || null,
      google_maps_url: item.google_maps_url || null,
      pipeline_stage: item.pipeline_stage || 'ยังไม่ได้ติดต่อ',
      contact_person: item.contact_person || null,
      target_product: item.target_product || null,
      notes: item.notes || null,
      tax_id: item.tax_id || null,
      registered_capital: item.registered_capital || null,
      source_type,
      source_id,
    });
  }

  if (toInsert.length > 0) {
    try {
      const { data, error } = await supabase
        .from('my_customers')
        .insert(toInsert)
        .select();

      if (error) {
        console.error('Error adding to my_customers:', error);
      } else if (data) {
        const updated = [...data, ...current];
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT_NAME, { detail: { myCustomers: updated } }));
        return updated;
      }
    } catch (err) {
      console.error('addToMyCustomers exception:', err);
    }
  }

  return current;
}

// Backward-compatible alias
export const addToPortfolio = addToMyCustomers;

/**
 * Remove a customer from my_customers table in Supabase
 */
export async function removeFromMyCustomers(
  itemOrId: any
): Promise<MyCustomer[]> {
  const current = getLocalMyCustomers();
  let targetId: number | null = null;
  let source_type: string | null = null;
  let source_id: number | null = null;

  if (typeof itemOrId === 'number') {
    const found = current.find((c) => c.id === itemOrId || (c.source_type === 'CUSTOMERS' && c.source_id === itemOrId));
    if (found) {
      targetId = found.id;
    } else {
      targetId = itemOrId;
    }
  } else if (itemOrId) {
    if (itemOrId.id && typeof itemOrId.id === 'number') {
      const found = current.find((c) => c.id === itemOrId.id);
      if (found) targetId = found.id;
    }
    if (!targetId) {
      const crmId = itemOrId.crm_id || (typeof itemOrId.id === 'number' ? itemOrId.id : null);
      const dbdId = itemOrId.dbd_id;
      const found = current.find((c) => 
        (crmId && c.source_type === 'CUSTOMERS' && c.source_id === crmId) ||
        (dbdId && c.source_type === 'DBD' && c.source_id === dbdId) ||
        (c.name && itemOrId.name && c.name.trim().toLowerCase() === itemOrId.name.trim().toLowerCase())
      );
      if (found) targetId = found.id;
    }
  }

  if (targetId) {
    try {
      const { error } = await supabase
        .from('my_customers')
        .delete()
        .eq('id', targetId);

      if (error) {
        console.error('Error deleting from my_customers:', error);
      } else {
        const updated = current.filter((c) => c.id !== targetId);
        localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent(PORTFOLIO_EVENT_NAME, { detail: { myCustomers: updated } }));
        return updated;
      }
    } catch (err) {
      console.error('removeFromMyCustomers exception:', err);
    }
  }

  return current;
}

// Backward-compatible alias
export const removeFromPortfolio = removeFromMyCustomers;

/**
 * Toggle a factory in/out of my_customers
 */
export async function togglePortfolio(factory: any): Promise<boolean> {
  if (isFactoryInPortfolio(factory)) {
    await removeFromMyCustomers(factory);
    return false;
  } else {
    await addToMyCustomers(factory);
    return true;
  }
}

/**
 * Subscribe to changes in my_customers
 */
export function subscribeToPortfolioChanges(callback: (myCustomers: MyCustomer[]) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail && Array.isArray(customEvent.detail.myCustomers)) {
      callback(customEvent.detail.myCustomers);
    } else {
      callback(getLocalMyCustomers());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === PORTFOLIO_STORAGE_KEY) {
      callback(getLocalMyCustomers());
    }
  };

  window.addEventListener(PORTFOLIO_EVENT_NAME, handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(PORTFOLIO_EVENT_NAME, handler);
    window.removeEventListener('storage', storageHandler);
  };
}
