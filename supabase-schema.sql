-- 1. สร้างตาราง customers สำหรับเก็บข้อมูลโรงงาน/ลูกค้า
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGSERIAL PRIMARY KEY,
    seq INT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    district TEXT,
    province TEXT,
    website TEXT,
    google_maps_url TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    rating NUMERIC,
    review_count INT,
    business_type TEXT,
    operating_status TEXT DEFAULT 'เปิดดำเนินการ',
    place_id TEXT,
    pipeline_stage TEXT DEFAULT 'ยังไม่ได้ติดต่อ',
    contact_person TEXT,
    target_product TEXT DEFAULT 'เครื่องกรองน้ำมันไฮดรอลิก / เครื่องฟื้นฟูน้ำยาหล่อเย็น',
    contact_result TEXT,
    notes TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. เปิดใช้งาน Row Level Security (RLS) และอนุญาตให้อ่าน/เขียนได้
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.customers
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.customers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.customers
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON public.customers
    FOR DELETE USING (true);
