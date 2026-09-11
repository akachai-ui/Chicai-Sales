-- ==============================================================================
-- อัปเดตโครงสร้างตาราง dbd_companies ให้พร้อมสำหรับข้อมูลที่คลีนแล้ว
-- ==============================================================================

-- 1. เพิ่มคอลัมน์ industry_group (หมวดหมู่ธุรกิจ เช่น โรงงานผลิต, ค้าส่ง, บริการ)
ALTER TABLE public.dbd_companies ADD COLUMN IF NOT EXISTS industry_group TEXT;

-- 2. ลบคอลัมน์ pipeline_stage, phone, email, notes ออก (คงไว้เฉพาะ Master Data บริสุทธิ์)
ALTER TABLE public.dbd_companies 
    DROP COLUMN IF EXISTS pipeline_stage,
    DROP COLUMN IF EXISTS phone,
    DROP COLUMN IF EXISTS email,
    DROP COLUMN IF EXISTS notes;

-- 3. สร้าง Index เพิ่มเติมเพื่อการค้นหาตามหมวดหมู่อย่างรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_dbd_industry_group ON public.dbd_companies (industry_group);
CREATE INDEX IF NOT EXISTS idx_dbd_capital ON public.dbd_companies (registered_capital);

-- 4. ล้างข้อมูลเก่าเพื่อรองรับข้อมูลชุดคลีน 100%
TRUNCATE TABLE public.dbd_companies;
