'use client';

import React, { useState, useEffect } from 'react';
import { Customer } from '@/types/customer';
import {
  X,
  Mail,
  Send,
  Copy,
  Check,
  Code,
  Sparkles,
  ExternalLink,
  Phone,
  FileText
} from 'lucide-react';

interface EmailComposeModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
}

interface EmailTemplate {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  subject: string;
  body: string;
}

// Generate the exact HTML template provided by Akachai (Max)
export const getFullHtmlTemplate = (companyName: string) => `
<div style="background-color: #f4f7f6; padding: 20px 10px; font-family: Tahoma, 'Segoe UI', sans-serif;">
  <!-- กล่องจดหมายหลัก -->
  <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
    
    <div style="background-color: #eef7f6; padding: 15px 25px; border-bottom: 3px solid #219990; font-size: 14px; color: #18756e; text-align: center;">
      <b>เรียน แอดมิน / ผู้ดูแลอีเมลกลางของบริษัท (Dear Admin)</b><br>
      รบกวนส่งต่ออีเมลฉบับนี้ให้กับ <b>ฝ่ายจัดซื้อ (Purchasing)</b> หรือ <b>ฝ่ายซ่อมบำรุง (Maintenance)</b> ของ <b>${companyName}</b> เพื่อพิจารณาโซลูชันลดต้นทุนการผลิตและยืดอายุเครื่องจักรครับ ขอขอบพระคุณล่วงหน้าครับ<br>
      <br>
      <span style="font-size: 13px;"><i>Please kindly forward this email to the <b>Purchasing</b> or <b>Maintenance</b> department of <b>${companyName}</b> to consider our cost-reduction and machine life-extension solutions. Thank you in advance.</i></span>
    </div>

    <a href="https://catalog-chicai-lilac.vercel.app/" target="_blank" style="display: block;">
      <img src="cid:bannerImage" alt="Banner" style="width: 100%; height: auto; display: block; border: none;">
    </a>

    <div style="padding: 30px 25px; color: #333333; line-height: 1.7; font-size: 15px;">
      <p style="margin-top: 0;">เรียน ฝ่ายจัดซื้อ และ ฝ่ายซ่อมบำรุง <b>${companyName}</b></p>
      <p>ปัจจุบันทางโรงงานกำลังพบปัญหาเหล่านี้ในการดูแลเครื่องจักรอยู่หรือไม่ครับ?</p>
      
      <ul style="padding-left: 20px; color: #444;">
        <li style="margin-bottom: 8px;">ต้องเสียค่าใช้จ่ายในการเปลี่ยนถ่ายน้ำมันไฮดรอลิก หรือน้ำมันตัดกลึงบ่อยครั้ง</li>
        <li style="margin-bottom: 8px;">น้ำยาหล่อเย็น (Coolant) เสื่อมสภาพเร็ว มีกลิ่นเหม็นเน่า และมีคราบน้ำมันลอยเจือปน</li>
        <li style="margin-bottom: 8px;">มีเศษตะกรันโลหะสะสมในถัง ทำให้เครื่องจักร CNC หรือ EDM ทำงานสะดุด</li>
      </ul>
      
      <p>ทาง CHICAI ELECTRIC ขอแนะนำ <b>ซีรีส์เครื่องจักรอัจฉริยะสำหรับฟื้นฟูคุณภาพน้ำมันและน้ำยาหล่อเย็น</b> ที่จะช่วยแก้ปัญหาหน้างาน พร้อม <span style="color: #d9534f; font-weight: bold;">ลดต้นทุนการซื้อน้ำมันใหม่ได้ถึง 70%</span></p>
      
      <a href="https://catalog-chicai-lilac.vercel.app/" target="_blank" style="display: block; margin: 25px 0; text-align: center;">
        <img src="cid:product1Image" alt="Product 1" style="width: 100%; max-width: 600px; height: auto; border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      </a>

      <div style="background-color: #f8fcfb; border-left: 4px solid #219990; padding: 15px 20px; margin: 30px 0;">
        <p style="margin-top: 0; font-size: 16px; color: #219990;"><b>[ สรุปรายการสินค้าเด่นและราคาพิเศษ ]</b></p>
        <ol style="padding-left: 20px; margin-bottom: 0; color: #444;">
          <li style="margin-bottom: 10px;"><b>เครื่องกรองน้ำมัน (กระบอกคู่) รุ่น LYJ-001-D:</b> กรองละเอียด 1 ไมครอน เสียบไฟ 220V ใช้ได้ทันที คืนความใสให้น้ำมัน (82,000 บาท)</li>
          <li style="margin-bottom: 10px;"><b>เครื่องกรองน้ำมัน (กระบอกเดี่ยว) รุ่น LYJ-001-S:</b> กรองละเอียด 1 ไมครอน ขนาดกะทัดรัด (65,000 บาท)</li>
          <li style="margin-bottom: 10px;"><b>เครื่องกำจัดตะกรัน รุ่น NXC-QZJ-116A:</b> ดูดตะกรันและเศษโลหะด้วยแรงดันระบบลม ปลอดภัยสูง (82,000 บาท)</li>
          <li style="margin-bottom: 0;"><b>เครื่องฟื้นฟูน้ำยาหล่อเย็น รุ่น NXC-ZSJ-100:</b> มาพร้อมระบบโอโซนฆ่าเชื้อ ลดกลิ่นเหม็น และแยกน้ำมันลอย (เริ่มต้น 175,000 บาท)</li>
        </ol>
      </div>

      <a href="https://catalog-chicai-lilac.vercel.app/" target="_blank" style="display: block; margin: 25px 0; text-align: center;">
        <img src="cid:product2Image" alt="Product 2" style="width: 100%; max-width: 600px; height: auto; border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      </a>

      <p style="font-size: 16px; color: #219990;"><b>[ บริการพิเศษสำหรับ ${companyName} ]</b></p>
      <p>เพื่อให้ท่านมั่นใจในประสิทธิภาพก่อนตัดสินใจ ทางเรายินดีนำเครื่องจักรเข้าไป <b>สาธิต (Demo On-site) ให้ทดลองใช้งานฟรีถึงหน้างานจริง</b></p>
      
      <hr style="border: 0; border-top: 1px solid #ddd; margin: 40px 0 30px 0;">

      <!-- ENGLISH VERSION -->
      <p style="margin-top: 0;">Dear Purchasing and Maintenance team of <b>${companyName}</b>,</p>
      <p>Is your factory currently facing any of these maintenance challenges?</p>
      
      <ul style="padding-left: 20px; color: #444;">
        <li style="margin-bottom: 8px;">High expenses from frequent hydraulic or cutting oil replacements.</li>
        <li style="margin-bottom: 8px;">Rapid coolant degradation, bad odor, and tramp oil contamination.</li>
        <li style="margin-bottom: 8px;">Sludge and metal chips accumulating in tanks, causing CNC or EDM machine malfunctions.</li>
      </ul>
      
      <p>CHICAI ELECTRIC introduces our <b>Intelligent Oil & Coolant Purification Series</b>, designed to solve these on-site issues and <span style="color: #d9534f; font-weight: bold;">reduce new oil purchasing costs by up to 70%</span>.</p>
      
      <div style="background-color: #f8fcfb; border-left: 4px solid #219990; padding: 15px 20px; margin: 30px 0;">
        <p style="margin-top: 0; font-size: 16px; color: #219990;"><b>[ Featured Products & Special Prices ]</b></p>
        <ol style="padding-left: 20px; margin-bottom: 0; color: #444;">
          <li style="margin-bottom: 10px;"><b>Double-Cylinder Oil Purifier (LYJ-001-D):</b> 1-micron precision, 220V plug & play. (82,000 THB)</li>
          <li style="margin-bottom: 10px;"><b>Single-Cylinder Oil Purifier (LYJ-001-S):</b> 1-micron precision, compact size. (65,000 THB)</li>
          <li style="margin-bottom: 10px;"><b>Sludge & Metal Chip Vacuum (NXC-QZJ-116A):</b> Pneumatic-driven, highly safe. (82,000 THB)</li>
          <li style="margin-bottom: 0;"><b>Coolant Purifier (NXC-ZSJ-100):</b> Built-in ozone generator for sterilization and odor reduction. (Starting at 175,000 THB)</li>
        </ol>
      </div>

      <p style="font-size: 16px; color: #219990;"><b>[ Special Offer for ${companyName} ]</b></p>
      <p>To ensure your complete confidence in our efficiency, we are pleased to offer a <b>Free On-site Demo</b> at your factory.</p>
      <p>หากสนใจขอรับแคตตาล็อกสเปกเชิงลึก หรือต้องการจัดคิวนัดหมายทดสอบเครื่อง สามารถติดต่อผม (แม็ก) ได้โดยตรงครับ / <br><i>If you are interested in our detailed catalog or would like to schedule a machine test, please feel free to contact me directly.</i></p>
      
      <p style="margin-bottom: 0;">ขอแสดงความนับถือ / Best Regards,</p>
    </div>

    <!-- ลายเซ็น / Footer พร้อมรูปโปรไฟล์ -->
    <div style="background-color: #f4f6f9; padding: 25px; border-top: 1px solid #e0e4e8;">
      <div style="display: block;">
        <!-- กล่องรูปโปรไฟล์ -->
        <div style="display: inline-block; vertical-align: top; margin-right: 18px; margin-bottom: 15px;">
          <img src="cid:salesPicImage" alt="Akachai Habantan" style="width: 100px; height: auto; border-radius: 6px; border: 2px solid #219990; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        </div>
        
        <!-- กล่องข้อมูลติดต่อ -->
        <div style="display: inline-block; vertical-align: top; font-size: 14px; line-height: 1.7; color: #555555; max-width: 450px; word-wrap: break-word;">
          <b style="color: #222; font-size: 16px;">เอกชัย หาบ้านแท่น (แม็ก) | Akachai Habantan (Max)</b><br>
          Sales Executive<br>
          <b style="color: #219990; font-size: 15px;">CHICAI ELECTRIC (THAILAND) CO., LTD.</b><br>
          <div style="margin-top: 10px;">
            <b>Mobile:</b> <a href="tel:0924797666" style="color: #555; text-decoration: none;">092-479-7666</a><br>
            <b>Email:</b> <a href="mailto:akachai.chicai@gmail.com" style="color: #219990; text-decoration: none;">akachai.chicai@gmail.com</a><br>
            <b>Website:</b> <a href="https://catalog-chicai-lilac.vercel.app/" style="color: #219990; text-decoration: none;" target="_blank">View Online Catalog</a><br>
            <span style="display: block; margin-top: 4px;"><b>Address:</b> 5/2 ชั้นที่ 3 หมู่ที่ 12 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540</span>
          </div>
          <div style="margin-top: 15px;">
            <a href="https://catalog-chicai-lilac.vercel.app/" target="_blank">
              <img src="cid:logoImage" alt="CHICAI ELECTRIC" style="max-width: 120px; height: auto; border: none;">
            </a>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>
`;

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'chicai_official',
    title: 'CHICAI Official (ลดต้นทุน 70% + On-site Demo)',
    icon: '🌟',
    badge: 'เทมเพลตหลัก',
    subject: 'เรียน ฝ่ายจัดซื้อ / ฝ่ายซ่อมบำรุง {customer_name} - ขอแนะนำเครื่องฟื้นฟูคุณภาพน้ำมันและน้ำยาหล่อเย็น ลดต้นทุน 70% | Chicai Electric',
    body: `เรียน แอดมิน / ผู้ดูแลอีเมลกลางของบริษัท (Dear Admin)
รบกวนส่งต่ออีเมลฉบับนี้ให้กับ ฝ่ายจัดซื้อ (Purchasing) หรือ ฝ่ายซ่อมบำรุง (Maintenance) ของ {customer_name} เพื่อพิจารณาโซลูชันลดต้นทุนการผลิตและยืดอายุเครื่องจักรครับ ขอขอบพระคุณล่วงหน้าครับ

(Please kindly forward this email to the Purchasing or Maintenance department of {customer_name}. Thank you in advance.)

--------------------------------------------------

เรียน ฝ่ายจัดซื้อ และ ฝ่ายซ่อมบำรุง {customer_name}

ปัจจุบันทางโรงงานกำลังพบปัญหาเหล่านี้ในการดูแลเครื่องจักรอยู่หรือไม่ครับ?
• ต้องเสียค่าใช้จ่ายในการเปลี่ยนถ่ายน้ำมันไฮดรอลิก หรือน้ำมันตัดกลึงบ่อยครั้ง
• น้ำยาหล่อเย็น (Coolant) เสื่อมสภาพเร็ว มีกลิ่นเหม็นเน่า และมีคราบน้ำมันลอยเจือปน
• มีเศษตะกรันโลหะสะสมในถัง ทำให้เครื่องจักร CNC หรือ EDM ทำงานสะดุด

ทาง CHICAI ELECTRIC ขอแนะนำ "ซีรีส์เครื่องจักรอัจฉริยะสำหรับฟื้นฟูคุณภาพน้ำมันและน้ำยาหล่อเย็น" ที่จะช่วยแก้ปัญหาหน้างาน พร้อม ลดต้นทุนการซื้อน้ำมันใหม่ได้ถึง 70%

[ สรุปรายการสินค้าเด่นและราคาพิเศษ ]
1. เครื่องกรองน้ำมัน (กระบอกคู่) รุ่น LYJ-001-D: กรองละเอียด 1 ไมครอน เสียบไฟ 220V ใช้ได้ทันที คืนความใสให้น้ำมัน (82,000 บาท)
2. เครื่องกรองน้ำมัน (กระบอกเดี่ยว) รุ่น LYJ-001-S: กรองละเอียด 1 ไมครอน ขนาดกะทัดรัด (65,000 บาท)
3. เครื่องกำจัดตะกรัน รุ่น NXC-QZJ-116A: ดูดตะกรันและเศษโลหะด้วยแรงดันระบบลม ปลอดภัยสูง (82,000 บาท)
4. เครื่องฟื้นฟูน้ำยาหล่อเย็น รุ่น NXC-ZSJ-100: มาพร้อมระบบโอโซนฆ่าเชื้อ ลดกลิ่นเหม็น และแยกน้ำมันลอย (เริ่มต้น 175,000 บาท)

[ บริการพิเศษสำหรับ {customer_name} ]
เพื่อให้ท่านมั่นใจในประสิทธิภาพก่อนตัดสินใจ ทางเรายินดีนำเครื่องจักรเข้าไป "สาธิต (Demo On-site) ให้ทดลองใช้งานฟรีถึงหน้างานจริง"

หากสนใจขอรับแคตตาล็อกสเปกเชิงลึก หรือต้องการจัดคิวนัดหมายทดสอบเครื่อง สามารถติดต่อผม (แม็ก) ได้โดยตรงครับ
📖 ดูแคตตาล็อกสินค้าออนไลน์: https://catalog-chicai-lilac.vercel.app/

--------------------------------------------------
[ ENGLISH VERSION ]
Dear Purchasing and Maintenance team of {customer_name},

Is your factory currently facing maintenance challenges such as frequent oil replacement, coolant degradation, or sludge accumulation?

CHICAI ELECTRIC introduces our Intelligent Oil & Coolant Purification Series, designed to solve on-site issues and reduce new oil purchasing costs by up to 70%.

[ Featured Products ]
1. Double-Cylinder Oil Purifier (LYJ-001-D) - 82,000 THB
2. Single-Cylinder Oil Purifier (LYJ-001-S) - 65,000 THB
3. Sludge & Metal Chip Vacuum (NXC-QZJ-116A) - 82,000 THB
4. Coolant Purifier (NXC-ZSJ-100) - Starting at 175,000 THB

We are pleased to offer a Free On-site Demo at your factory.
Online Catalog: https://catalog-chicai-lilac.vercel.app/

--------------------------------------------------
ขอแสดงความนับถือ / Best Regards,

เอกชัย หาบ้านแท่น (แม็ก) | Akachai Habantan (Max)
Sales Executive
CHICAI ELECTRIC (THAILAND) CO., LTD.
Mobile: 092-479-7666
Email: akachai.chicai@gmail.com
Website: https://catalog-chicai-lilac.vercel.app/
Address: 5/2 ชั้นที่ 3 หมู่ที่ 12 ต.บางพลีใหญ่ อ.บางพลี จ.สมุทรปราการ 10540
`,
  },
  {
    id: 'demo',
    title: 'นัดหมายสาธิต Demo On-site ฟรี',
    icon: '🤝',
    subject: 'ขออนุญาตเข้าพบนัดหมายตรวจเช็คคุณภาพน้ำมันและสาธิตเครื่องฟรี - {customer_name} | Chicai Electric',
    body: `เรียน ฝ่ายซ่อมบำรุง / จัดซื้อ {customer_name}

สืบเนื่องจากที่ทาง CHICAI ELECTRIC ได้ให้บริการโซลูชันด้านการฟื้นฟูคุณภาพน้ำมันไฮดรอลิกและน้ำยาหล่อเย็น
ทางทีมงานขออนุญาตสอบถามความสะดวก เพื่อขอนัดหมายเข้าพบในการ:
1. นำเครื่องมือตรวจวัดคุณภาพน้ำมันไฮดรอลิก / น้ำยาหล่อเย็น เข้าตรวจเช็คหน้างาน (ไม่มีค่าใช้จ่าย)
2. นำเครื่องสาธิตจริง (Demo) ไปทดสอบประสิทธิภาพให้เห็นผลลัพธ์ที่หน้างานจริง

หากทางคุณ สะดวกเป็นช่วงวันและเวลาใด สามารถตอบกลับอีเมลนี้หรือโทรติดต่อผม (แม็ก: 092-479-7666) ได้เลยครับ

ขอแสดงความนับถือ,
เอกชัย หาบ้านแท่น (แม็ก)
Sales Executive | CHICAI ELECTRIC (THAILAND) CO., LTD.
โทร: 092-479-7666 / อีเมล: akachai.chicai@gmail.com
แคตตาล็อกออนไลน์: https://catalog-chicai-lilac.vercel.app/
`,
  },
  {
    id: 'catalog',
    title: 'ส่งแคตตาล็อก & รายละเอียดสินค้า',
    icon: '📄',
    subject: 'ส่งเอกสารแคตตาล็อกเครื่องกรองน้ำมันและฟื้นฟูน้ำยาหล่อเย็น - {customer_name} | Chicai Electric',
    body: `เรียน ฝ่ายจัดซื้อ และ ฝ่ายซ่อมบำรุง {customer_name}

ตามที่ได้มีการประสานงานเบื้องต้น ทาง CHICAI ELECTRIC ขอส่งลิงก์แคตตาล็อกสินค้าและเอกสารแนะนำโซลูชันมาให้ท่านพิจารณาครับ:

📖 แคตตาล็อกสินค้าออนไลน์: https://catalog-chicai-lilac.vercel.app/

รายการสินค้าแนะนำ:
• เครื่องกรองน้ำมันไฮดรอลิก รุ่น LYJ Series (กรองละเอียด 1 ไมครอน)
• เครื่องฟื้นฟูน้ำยาหล่อเย็น Coolant Purifier รุ่น NXC-ZSJ Series
• เครื่องดูดตะกรันและเศษโลหะ Sludge Cleaner

หากต้องการใบเสนอราคา (Quotation) หรือสนใจนัดหมาย Demo ทดลองใช้งานฟรี ยินดีบริการครับ

ขอแสดงความนับถือ,
เอกชัย หาบ้านแท่น (แม็ก)
Sales Executive | CHICAI ELECTRIC (THAILAND) CO., LTD.
โทร: 092-479-7666 / อีเมล: akachai.chicai@gmail.com
`,
  },
  {
    id: 'followup',
    title: 'ติดตามผลการเสนอราคา / ความคืบหน้า',
    icon: '⏳',
    subject: 'ติดตามความคืบหน้าเรื่องโซลูชันเครื่องกรองน้ำมันและฟื้นฟูน้ำยาหล่อเย็น - {customer_name}',
    body: `เรียน ฝ่ายจัดซื้อ / ฝ่ายซ่อมบำรุง {customer_name}

ทาง CHICAI ELECTRIC ขออนุญาตสอบถามความคืบหน้าเกี่ยวกับการพิจารณาโซลูชันเครื่องฟื้นฟูคุณภาพน้ำมันและน้ำยาหล่อเย็นครับ
ไม่ทราบว่าทาง {customer_name} มีข้อสงสัยหรือต้องการข้อมูลเอกสารสเปกเพิ่มเติมในส่วนใดหรือไม่ครับ

ยินดีให้คำปรึกษาและพร้อมเข้าบริการ Demo หน้างานครับ

ขอแสดงความนับถือ,
เอกชัย หาบ้านแท่น (แม็ก)
Sales Executive | CHICAI ELECTRIC (THAILAND) CO., LTD.
โทร: 092-479-7666 / อีเมล: akachai.chicai@gmail.com
`,
  },
  {
    id: 'custom',
    title: 'กำหนดข้อความเอง (Custom)',
    icon: '✏️',
    subject: 'ติดต่อจาก Chicai Electric - {customer_name}',
    body: `เรียน ฝ่ายจัดซื้อ / ฝ่ายซ่อมบำรุง {customer_name}



ขอแสดงความนับถือ,
เอกชัย หาบ้านแท่น (แม็ก)
Sales Executive | CHICAI ELECTRIC (THAILAND) CO., LTD.
โทร: 092-479-7666
อีเมล: akachai.chicai@gmail.com
`,
  },
];

export default function EmailComposeModal({
  isOpen,
  customer,
  onClose,
}: EmailComposeModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('chicai_official');
  const [viewMode, setViewMode] = useState<'text' | 'html'>('text');
  const [toEmail, setToEmail] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [gmailNotice, setGmailNotice] = useState<boolean>(false);

  // Apply template with replaced variables
  const applyTemplate = (templateId: string, cust: Customer | null) => {
    setSelectedTemplateId(templateId);
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === templateId) || EMAIL_TEMPLATES[0];
    if (!cust) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
      return;
    }

    const customerName = cust.name || 'ลูกค้า';
    const contactPerson = cust.contact_person || 'ผู้จัดการฝ่ายซ่อมบำรุง / จัดซื้อ';
    const targetProduct = cust.target_product || 'เครื่องกรองน้ำมันไฮดรอลิก / เครื่องฟื้นฟูน้ำยาหล่อเย็น';

    const sub = tmpl.subject
      .replace(/{customer_name}/g, customerName)
      .replace(/{contact_person}/g, contactPerson)
      .replace(/{target_product}/g, targetProduct);

    const bdy = tmpl.body
      .replace(/{customer_name}/g, customerName)
      .replace(/{contact_person}/g, contactPerson)
      .replace(/{target_product}/g, targetProduct);

    setSubject(sub);
    setBody(bdy);
  };

  useEffect(() => {
    if (isOpen && customer) {
      setToEmail(customer.email || '');
      applyTemplate('chicai_official', customer);
      setViewMode('text');
      setCopiedText(false);
      setCopiedHtml(false);
      setGmailNotice(false);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const htmlContent = getFullHtmlTemplate(customer.name);

  // Format clean comma-separated emails
  const cleanToEmail = toEmail
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean)
    .join(',');

  // Safe Gmail Compose URL (Pass to and su; body is auto-copied to clipboard to prevent HTTP 400 Bad Request from long query strings)
  const getGmailUrl = () => {
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: cleanToEmail,
      su: subject,
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  };

  // Standard Mailto URL
  const getMailtoUrl = () => {
    return `mailto:${encodeURIComponent(cleanToEmail)}?subject=${encodeURIComponent(subject)}`;
  };

  const handleOpenGmail = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedText(true);
      setGmailNotice(true);
      setTimeout(() => setCopiedText(false), 4000);
    } catch (err) {
      console.error('Clipboard copy failed', err);
    }
    window.open(getGmailUrl(), '_blank', 'noopener,noreferrer');
  };

  const handleOpenMailto = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedText(true);
      setGmailNotice(true);
      setTimeout(() => setCopiedText(false), 4000);
    } catch (err) {
      console.error('Clipboard copy failed', err);
    }
    window.location.href = getMailtoUrl();
  };

  const handleCopyText = async () => {
    const fullText = `หัวข้อ: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 2500);
    } catch (err) {
      console.error('Failed to copy HTML', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center space-x-2">
                <span>ส่งอีเมล / Gmail</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/30 text-emerald-100 border border-emerald-300/30">
                  CHICAI ELECTRIC
                </span>
              </h3>
              <p className="text-xs text-teal-100 truncate max-w-xs sm:max-w-md">
                ผู้รับ: <b>{customer.name}</b>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header Tabs (Text Mode vs HTML Mode) */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setViewMode('text')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'text'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ข้อความส่ง Gmail (Text)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('html')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'html'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>โค้ด HTML Template</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            👤 เอกชัย (แม็ก) 092-479-7666
          </span>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs sm:text-sm">
          
          {/* Quick Notice Banner */}
          {gmailNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-start space-x-2.5 animate-in fade-in duration-200">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <span className="font-extrabold block text-emerald-800">✅ คัดลอกเนื้อหาอีเมลให้อัตโนมัติแล้ว!</span>
                หน้าต่าง Gmail กำลังเปิดขึ้นมา พร้อมใส่อีเมลผู้รับและหัวข้อให้แล้ว เพียงกด <b>"วาง" (Ctrl+V หรือ Cmd+V)</b> ในช่องเนื้อหาของ Gmail ได้ทันทีครับ
              </div>
            </div>
          )}

          {viewMode === 'text' ? (
            <>
              {/* Template Selector Pills */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  เลือกแม่แบบข้อความ (Templates)
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {EMAIL_TEMPLATES.map((tmpl) => {
                    const isSelected = selectedTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => applyTemplate(tmpl.id, customer)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-press ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-md shadow-teal-700/30 scale-102 ring-2 ring-teal-500'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{tmpl.icon}</span>
                        <span>{tmpl.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email Recipient (To) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ถึง (To Email)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={toEmail}
                    onChange={(e) => setToEmail(e.target.value)}
                    placeholder="กรอกอีเมล เช่น purchasing@company.com หรือ admin@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm font-medium"
                  />
                  {!toEmail && (
                    <span className="absolute right-3 top-2.5 text-[11px] font-semibold text-amber-600">
                      ⚠️ ยังไม่มีอีเมลลูกค้า (กรอกเองได้)
                    </span>
                  )}
                </div>
              </div>

              {/* Email Subject */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  หัวข้ออีเมล (Subject)
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm font-bold text-slate-900"
                />
              </div>

              {/* Email Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600">
                    เนื้อหาอีเมล (Body)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex items-center space-x-1 text-[11px] font-bold text-slate-500 hover:text-teal-700 transition-colors"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">คัดลอกข้อความแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกข้อความ</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm font-sans leading-relaxed text-slate-800"
                />
              </div>
            </>
          ) : (
            /* HTML Template View */
            <div className="space-y-3">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-teal-900">โค้ด HTML Template ฉบับเต็ม</h4>
                  <p className="text-[11px] text-teal-700">แทนที่ชื่อบริษัท <span className="font-bold">"{customer.name}"</span> เรียบร้อยแล้ว สามารถนำไปวางส่งได้ทันที</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyHtml}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition-colors shrink-0 shadow-sm"
                >
                  {copiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHtml ? 'คัดลอก HTML แล้ว!' : 'คัดลอก HTML ทั้งหมด'}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={14}
                value={htmlContent}
                className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed select-all"
              />
            </div>
          )}

        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          
          <button
            type="button"
            onClick={handleCopyText}
            className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors touch-press"
          >
            {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            <span>{copiedText ? 'คัดลอกข้อความแล้ว' : 'คัดลอกข้อความทั้งหมด'}</span>
          </button>

          <div className="flex items-center space-x-2">
            {/* Default Mail App Link */}
            <button
              type="button"
              onClick={handleOpenMailto}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors touch-press"
              title="เปิดในแอปเมลเริ่มต้น (Apple Mail / Outlook)"
            >
              <Mail className="w-4 h-4 text-slate-600" />
              <span>แอปเมลทั่วไป</span>
            </button>

            {/* Direct Gmail Button */}
            <button
              type="button"
              onClick={handleOpenGmail}
              className="flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-md shadow-teal-700/30 transition-all touch-press active:scale-95"
              title="เปิดหน้าเขียนอีเมลใน Gmail ทันที"
            >
              <Send className="w-4 h-4" />
              <span>เปิดใน Gmail</span>
              <ExternalLink className="w-3 h-3 text-teal-200" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
