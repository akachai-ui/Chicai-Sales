import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, companyName, email, webhookUrl, contactPerson } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุอีเมลผู้รับ' },
        { status: 400 }
      );
    }

    const effectiveWebhookUrl = (webhookUrl && webhookUrl.trim()) 
      || process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_WEBHOOK_URL 
      || 'https://script.google.com/macros/s/AKfycbzgMv1TsTAhpmhJSdfsZBrfAvfuSLqIUnuGpx2TntdMyKCY0YZTeiKLIWTkbP9nFGj3/exec';

    if (!effectiveWebhookUrl) {
      return NextResponse.json(
        { success: false, error: 'ยังไม่ได้ตั้งค่า Google Apps Script Webhook URL' },
        { status: 400 }
      );
    }

    // 1. Call Google Apps Script Webhook
    const gasResponse = await fetch(effectiveWebhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyName: companyName || 'ลูกค้า',
        email: email.trim(),
        contactPerson: contactPerson || '',
      }),
      // Google Apps Script redirect handling
      redirect: 'follow',
    });

    const gasResultText = await gasResponse.text();
    let gasData: any = {};
    try {
      gasData = JSON.parse(gasResultText);
    } catch {
      gasData = { success: true, message: gasResultText };
    }

    // 2. Automatically log activity into Supabase
    if (customerId) {
      try {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('customer_activities').insert({
          customer_id: customerId,
          activity_type: 'ส่งใบเสนอราคา',
          activity_date: today,
          contact_person: contactPerson || null,
          details: `ส่งอีเมล E-Catalog CHICAI ELECTRIC (ลดต้นทุน 70% + On-site Demo) ถึง ${email.trim()}`,
        });

        // Update pipeline stage to 'ติดต่อแล้ว / ติดตามงาน' if previously uncontacted
        const { data: currentCust } = await supabase
          .from('customers')
          .select('pipeline_stage')
          .eq('id', customerId)
          .single();

        if (!currentCust?.pipeline_stage || currentCust.pipeline_stage === 'ยังไม่ได้ติดต่อ') {
          await supabase
            .from('customers')
            .update({
              pipeline_stage: 'ติดต่อแล้ว / ติดตามงาน',
              updated_at: new Date().toISOString(),
            })
            .eq('id', customerId);
        }
      } catch (dbErr) {
        console.error('Failed to log email activity in Supabase:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ส่งอีเมล E-Catalog สำเร็จเรียบร้อยแล้ว',
      gasResponse: gasData,
    });
  } catch (err: any) {
    console.error('Error in send-email API:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'เกิดข้อผิดพลาดในการส่งอีเมล' },
      { status: 500 }
    );
  }
}
