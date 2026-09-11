-- ==============================================================================
-- 1. สร้างตาราง dbd_companies สำหรับเก็บฐานข้อมูลนิติบุคคล DBD (390,000+ บริษัท)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dbd_companies (
    id BIGSERIAL PRIMARY KEY,
    tax_id VARCHAR(20),
    name TEXT NOT NULL,
    registered_date VARCHAR(20),
    registered_capital NUMERIC,
    tsic_code VARCHAR(20),
    objective TEXT,
    address TEXT,
    subdistrict TEXT,
    district TEXT,
    province TEXT,
    zipcode VARCHAR(10),
    batch_year INT,
    batch_month INT,
    pipeline_stage TEXT DEFAULT 'ยังไม่ได้ติดต่อ',
    phone TEXT,
    email TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. สร้าง Index เพื่อเพิ่มความเร็วในการค้นหา คัดกรองจังหวัด และค้นหาชื่อ
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_dbd_tax_id ON public.dbd_companies (tax_id);
CREATE INDEX IF NOT EXISTS idx_dbd_province ON public.dbd_companies (province);
CREATE INDEX IF NOT EXISTS idx_dbd_district ON public.dbd_companies (district);
CREATE INDEX IF NOT EXISTS idx_dbd_tsic_code ON public.dbd_companies (tsic_code);

-- ==============================================================================
-- 3. เปิดใช้งาน Row Level Security (RLS) และกำหนดสิทธิ์ Access
-- ==============================================================================
ALTER TABLE public.dbd_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on dbd_companies" ON public.dbd_companies
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on dbd_companies" ON public.dbd_companies
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on dbd_companies" ON public.dbd_companies
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access on dbd_companies" ON public.dbd_companies
    FOR DELETE USING (true);
