-- Add email column to dbd_companies
ALTER TABLE public.dbd_companies 
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for fast email filtering and searching
CREATE INDEX IF NOT EXISTS idx_dbd_companies_email ON public.dbd_companies (email);
