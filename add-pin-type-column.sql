-- 1. Add pin_type column to dbd_companies
ALTER TABLE public.dbd_companies 
  ADD COLUMN IF NOT EXISTS pin_type TEXT DEFAULT 'DBD_ADDRESS';

-- 2. Add pin_type column to customers
ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS pin_type TEXT DEFAULT 'DBD_ADDRESS';

-- 3. Backfill existing records in dbd_companies
UPDATE public.dbd_companies 
  SET pin_type = 'GOOGLE_BUSINESS' 
  WHERE place_id IS NOT NULL AND latitude IS NOT NULL;

UPDATE public.dbd_companies 
  SET pin_type = 'DBD_ADDRESS' 
  WHERE place_id IS NULL AND latitude IS NOT NULL;

-- 4. Backfill existing records in customers
UPDATE public.customers 
  SET pin_type = 'GOOGLE_BUSINESS' 
  WHERE place_id IS NOT NULL AND latitude IS NOT NULL;

UPDATE public.customers 
  SET pin_type = 'DBD_ADDRESS' 
  WHERE place_id IS NULL AND latitude IS NOT NULL;

-- 5. Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_dbd_pin_type ON public.dbd_companies (pin_type);
CREATE INDEX IF NOT EXISTS idx_customers_pin_type ON public.customers (pin_type);
