'use client';

import { useState, useEffect } from 'react';
import { Customer, Deal, Product, Quotation, Activity, PipelineStage } from './types';
import { 
  INITIAL_CUSTOMERS, 
  INITIAL_DEALS, 
  INITIAL_PRODUCTS, 
  INITIAL_QUOTATIONS, 
  INITIAL_ACTIVITIES 
} from './mockData';
import { generateId, generateQuotationNumber } from './utils';

const STORAGE_KEYS = {
  CUSTOMERS: 'chicai_sales_customers_v1',
  DEALS: 'chicai_sales_deals_v1',
  PRODUCTS: 'chicai_sales_products_v1',
  QUOTATIONS: 'chicai_sales_quotations_v1',
  ACTIVITIES: 'chicai_sales_activities_v1',
};

export function useSalesStore() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const storedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const storedDeals = localStorage.getItem(STORAGE_KEYS.DEALS);
      const storedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const storedQuotations = localStorage.getItem(STORAGE_KEYS.QUOTATIONS);
      const storedActivities = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);

      setCustomers(storedCustomers ? JSON.parse(storedCustomers) : INITIAL_CUSTOMERS);
      setDeals(storedDeals ? JSON.parse(storedDeals) : INITIAL_DEALS);
      setProducts(storedProducts ? JSON.parse(storedProducts) : INITIAL_PRODUCTS);
      setQuotations(storedQuotations ? JSON.parse(storedQuotations) : INITIAL_QUOTATIONS);
      setActivities(storedActivities ? JSON.parse(storedActivities) : INITIAL_ACTIVITIES);
    } catch (e) {
      console.error('Error loading data from localStorage', e);
      setCustomers(INITIAL_CUSTOMERS);
      setDeals(INITIAL_DEALS);
      setProducts(INITIAL_PRODUCTS);
      setQuotations(INITIAL_QUOTATIONS);
      setActivities(INITIAL_ACTIVITIES);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save changes to LocalStorage
  const saveCustomers = (data: Customer[]) => {
    setCustomers(data);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data));
  };

  const saveDeals = (data: Deal[]) => {
    setDeals(data);
    localStorage.setItem(STORAGE_KEYS.DEALS, JSON.stringify(data));
  };

  const saveProducts = (data: Product[]) => {
    setProducts(data);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data));
  };

  const saveQuotations = (data: Quotation[]) => {
    setQuotations(data);
    localStorage.setItem(STORAGE_KEYS.QUOTATIONS, JSON.stringify(data));
  };

  const saveActivities = (data: Activity[]) => {
    setActivities(data);
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(data));
  };

  // --- Customer Operations ---
  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: generateId('cust'),
      createdAt: new Date().toISOString(),
      avatarColor: customer.avatarColor || 'bg-brand-600',
    };
    const updated = [newCustomer, ...customers];
    saveCustomers(updated);
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const updated = customers.map(c => c.id === id ? { ...c, ...updates } : c);
    saveCustomers(updated);
  };

  const deleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    saveCustomers(updated);
  };

  // --- Deal Operations ---
  const addDeal = (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newDeal: Deal = {
      ...deal,
      id: generateId('deal'),
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newDeal, ...deals];
    saveDeals(updated);
    return newDeal;
  };

  const updateDeal = (id: string, updates: Partial<Deal>) => {
    const now = new Date().toISOString();
    const updated = deals.map(d => d.id === id ? { ...d, ...updates, updatedAt: now } : d);
    saveDeals(updated);
  };

  const updateDealStage = (id: string, newStage: PipelineStage) => {
    const now = new Date().toISOString();
    const updated = deals.map(d => {
      if (d.id === id) {
        let prob = d.probability;
        if (newStage === 'lead_in') prob = 20;
        else if (newStage === 'contacted') prob = 40;
        else if (newStage === 'proposal_sent') prob = 60;
        else if (newStage === 'negotiation') prob = 80;
        else if (newStage === 'closed_won') prob = 100;
        else if (newStage === 'closed_lost') prob = 0;
        return { ...d, stage: newStage, probability: prob, updatedAt: now };
      }
      return d;
    });
    saveDeals(updated);
  };

  const deleteDeal = (id: string) => {
    const updated = deals.filter(d => d.id !== id);
    saveDeals(updated);
  };

  // --- Product Operations ---
  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: generateId('prod'),
    };
    const updated = [newProduct, ...products];
    saveProducts(updated);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const updated = products.map(p => p.id === id ? { ...p, ...updates } : p);
    saveProducts(updated);
  };

  const deleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    saveProducts(updated);
  };

  // --- Quotation Operations ---
  const addQuotation = (quotation: Omit<Quotation, 'id' | 'quotationNumber' | 'createdAt'>) => {
    const index = quotations.length + 1;
    const newQuotation: Quotation = {
      ...quotation,
      id: generateId('qt'),
      quotationNumber: generateQuotationNumber(index),
      createdAt: new Date().toISOString(),
    };
    const updated = [newQuotation, ...quotations];
    saveQuotations(updated);
    return newQuotation;
  };

  const updateQuotation = (id: string, updates: Partial<Quotation>) => {
    const updated = quotations.map(q => q.id === id ? { ...q, ...updates } : q);
    saveQuotations(updated);
  };

  const deleteQuotation = (id: string) => {
    const updated = quotations.filter(q => q.id !== id);
    saveQuotations(updated);
  };

  // --- Activity Operations ---
  const addActivity = (activity: Omit<Activity, 'id' | 'createdAt'>) => {
    const newActivity: Activity = {
      ...activity,
      id: generateId('act'),
      createdAt: new Date().toISOString(),
    };
    const updated = [newActivity, ...activities];
    saveActivities(updated);
    return newActivity;
  };

  const toggleActivity = (id: string) => {
    const updated = activities.map(a => a.id === id ? { ...a, completed: !a.completed } : a);
    saveActivities(updated);
  };

  const deleteActivity = (id: string) => {
    const updated = activities.filter(a => a.id !== id);
    saveActivities(updated);
  };

  // --- Reset All Data ---
  const resetToSampleData = () => {
    saveCustomers(INITIAL_CUSTOMERS);
    saveDeals(INITIAL_DEALS);
    saveProducts(INITIAL_PRODUCTS);
    saveQuotations(INITIAL_QUOTATIONS);
    saveActivities(INITIAL_ACTIVITIES);
  };

  return {
    isLoaded,
    customers,
    deals,
    products,
    quotations,
    activities,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addDeal,
    updateDeal,
    updateDealStage,
    deleteDeal,
    addProduct,
    updateProduct,
    deleteProduct,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    addActivity,
    toggleActivity,
    deleteActivity,
    resetToSampleData,
  };
}
