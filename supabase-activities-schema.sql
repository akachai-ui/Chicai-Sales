-- สร้างตาราง customer_activities สำหรับเก็บประวัติการเข้าพบและติดตามงานรอบต่างๆ
CREATE TABLE IF NOT EXISTS public.customer_activities (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES public.customers(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'โทรศัพท์',
  activity_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  contact_person TEXT,
  details TEXT NOT NULL,
  next_action_date DATE,
  next_action_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index สำหรับค้นหาประวัติตาม customer_id อย่างรวดเร็ว
CREATE INDEX IF NOT EXISTS idx_customer_activities_customer_id ON public.customer_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activities_date ON public.customer_activities(activity_date DESC);

-- Enable RLS
ALTER TABLE public.customer_activities ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy ให้อ่านและบันทึกข้อมูลได้
CREATE POLICY "Allow public read-write on customer_activities"
ON public.customer_activities
FOR ALL
USING (true)
WITH CHECK (true);
