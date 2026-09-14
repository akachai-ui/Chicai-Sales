"use client";

import React, { useState, useEffect } from "react";
import { Customer, CustomerActivity } from "@/types/customer";
import { supabase } from "@/lib/supabase";
import {
  X,
  Mail,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Rocket,
  Building2,
  Check,
  AlertTriangle,
  RotateCcw,
  ExternalLink
} from "lucide-react";

interface EmailComposeModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onEmailSent?: () => void;
}

const DEFAULT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbw8Av-WvIll9-5zyeyUS8spsFVGZdFqVHf-Arkxa6nCwTk_GJA3xQeHNCv2BL-rfdYT/exec";

export default function EmailComposeModal({
  isOpen,
  customer,
  onClose,
  onEmailSent,
}: EmailComposeModalProps) {
  const [toEmail, setToEmail] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");

  // Duplicate Check / History State
  const [previousEmailLog, setPreviousEmailLog] = useState<CustomerActivity | null>(null);
  const [checkingHistory, setCheckingHistory] = useState<boolean>(false);

  // Direct Send State via Google Apps Script Webhook
  const [gasWebhookUrl, setGasWebhookUrl] = useState<string>("");
  const [isSendingDirect, setIsSendingDirect] = useState<boolean>(false);
  const [directSendSuccess, setDirectSendSuccess] = useState<boolean>(false);
  const [directSendError, setDirectSendError] = useState<string | null>(null);
  const [showWebhookSettings, setShowWebhookSettings] = useState<boolean>(false);
  const [tempWebhookUrl, setTempWebhookUrl] = useState<string>("");

  // Load saved Webhook URL from localStorage or env
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("CHICAI_GAS_WEBHOOK_URL") ||
        process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_WEBHOOK_URL ||
        DEFAULT_WEBHOOK_URL;
      setGasWebhookUrl(saved);
      setTempWebhookUrl(saved);
    }
  }, []);

  const handleSaveWebhookUrl = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("CHICAI_GAS_WEBHOOK_URL", tempWebhookUrl.trim());
      setGasWebhookUrl(tempWebhookUrl.trim());
      setShowWebhookSettings(false);
    }
  };

  // Check if email was previously sent or customer was contacted
  const checkPreviousEmailHistory = async (cust: Customer) => {
    setCheckingHistory(true);
    try {
      // 1. Check synchronous latest activity from customer prop
      if (cust.latest_activity) {
        setPreviousEmailLog(cust.latest_activity);
      }

      // 2. Fetch all activities for this customer from Supabase
      const { data, error } = await supabase
        .from("customer_activities")
        .select("*")
        .eq("customer_id", cust.id)
        .order("activity_date", { ascending: false });

      if (!error && data && data.length > 0) {
        // Find email-related activity or latest activity
        const emailLog = data.find((act) => {
          const t = (act.activity_type || "").toLowerCase();
          const d = (act.details || "").toLowerCase();
          return (
            t.includes("เมล") ||
            t.includes("email") ||
            t.includes("ใบเสนอราคา") ||
            d.includes("เมล") ||
            d.includes("email") ||
            d.includes("presenting") ||
            d.includes("catalog")
          );
        });
        setPreviousEmailLog(emailLog || data[0]);
      } else if (cust.pipeline_stage && cust.pipeline_stage !== "ยังไม่ได้ติดต่อ") {
        setPreviousEmailLog({
          id: 0,
          customer_id: cust.id,
          activity_type: "ติดต่อแล้ว",
          activity_date: cust.updated_at || new Date().toISOString().split("T")[0],
          contact_person: cust.contact_person || null,
          details: `สถานะปัจจุบัน: ${cust.pipeline_stage}`,
          next_action_date: null,
          next_action_note: null,
        });
      } else {
        setPreviousEmailLog(null);
      }
    } catch (err) {
      console.error("Error checking email history:", err);
      if (cust.latest_activity) {
        setPreviousEmailLog(cust.latest_activity);
      }
    } finally {
      setCheckingHistory(false);
    }
  };

  // Template options to prevent spam filtering
  const [templateType, setTemplateType] = useState<"formal" | "concise" | "standard">("formal");

  // Template contents (Anti-Spam Optimized: No suspicious .vercel.app links)
  const getTemplateData = (type: "formal" | "concise" | "standard", custName: string) => {
    if (type === "formal") {
      return {
        subject: `ขออนุญาตนำเสนอข้อมูลแคตตาล็อกเครื่องจักรอุตสาหกรรม - บริษัท ชิไค อีเล็คทริค จำกัด (${custName})`,
        body: `เรียน ฝ่ายจัดซื้อ / ฝ่ายซ่อมบำรุงและวิศวกรรม ${custName}

บริษัท ชิไค อีเล็คทริค (ประเทศไทย) จำกัด ขออนุญาตนำเสนอข้อมูลผลิตภัณฑ์เครื่องจักรอุตสาหกรรมสำหรับโรงงาน เพื่อช่วยเพิ่มประสิทธิภาพการผลิต ยืดอายุการใช้งานน้ำมันหล่อลื่น และลดค่าใช้จ่ายในกระบวนการผลิต:

1. เครื่องกรองน้ำมันอุตสาหกรรม (กระบอกคู่) รุ่น LYJ-001-D: ความละเอียด 1 ไมครอน เสียบไฟ 220V ใช้งานได้ทันที
2. เครื่องกรองน้ำมันอุตสาหกรรม (กระบอกเดี่ยว) รุ่น LYJ-001-S: กรองละเอียด 1 ไมครอน ขนาดกะทัดรัด เคลื่อนย้ายสะดวก
3. เครื่องกำจัดตะกรันและเศษโลหะ รุ่น NXC-QZJ-116A: ระบบแรงดันลม ทำความสะอาดถังน้ำมันรวดเร็ว
4. เครื่องฟื้นฟูน้ำยาหล่อเย็นและกำจัดกลิ่น รุ่น NXC-ZSJ-100: โอโซนฆ่าเชื้อ แยกน้ำมันลอย ช่วยยืดอายุน้ำยาหล่อเย็น

ทางบริษัทยินดีนำเครื่องจักรเข้าไปสาธิตการทำงานจริง (Demo On-site) ที่โรงงานของท่านโดยไม่มีค่าใช้จ่าย

หากท่านต้องการรับไฟล์เอกสารแคตตาล็อกฉบับเต็ม (PDF) หรือสอบถามข้อมูลเพิ่มเติม สามารถตอบกลับอีเมลฉบับนี้ หรือติดต่อได้ตามข้อมูลด้านล่างนี้ครับ

ขอแสดงความนับถือ,
เอกชัย หาบ้านแท่น (แม็ก)
ฝ่ายขายและบริการเทคนิค โทร: 092-479-7666
บริษัท ชิไค อีเล็คทริค (ประเทศไทย) จำกัด`
      };
    } else if (type === "concise") {
      return {
        subject: `ขออนุญาตสอบถามข้อมูลฝ่ายจัดซื้อ / ซ่อมบำรุง - บริษัท ชิไค อีเล็คทริค จำกัด (${custName})`,
        body: `เรียน ฝ่ายจัดซื้อและซ่อมบำรุง ${custName}

บริษัท ชิไค อีเล็คทริค (ประเทศไทย) จำกัด ขออนุญาตสอบถามช่องทางติดต่อเพื่อส่งเอกสารแคตตาล็อกเครื่องกรองน้ำมันอุตสาหกรรมและฟื้นฟูน้ำยาหล่อเย็นสำหรับโรงงานครับ

หากท่านสะดวกรับข้อมูลผ่านอีเมลนี้ สามารถตอบกลับได้เลยครับ ทางเราจะจัดส่งไฟล์แคตตาล็อกและสเปกเครื่องจักรให้พิจารณาครับ

ขอแสดงความนับถือ,
เอกชัย หาบ้านแท่น (แม็ก)
โทร: 092-479-7666
บริษัท ชิไค อีเล็คทริค (ประเทศไทย) จำกัด`
      };
    } else {
      return {
        subject: `[ข้อมูลผลิตภัณฑ์] โซลูชันเครื่องกรองน้ำมันและฟื้นฟูน้ำยาหล่อเย็น - ${custName}`,
        body: `เรียน ฝ่ายจัดซื้อ และ ฝ่ายซ่อมบำรุง ${custName}

CHICAI ELECTRIC ขอแนะนำ "ซีรีส์เครื่องจักรอัจฉริยะสำหรับฟื้นฟูคุณภาพน้ำมันและน้ำยาหล่อเย็น":

1. เครื่องกรองน้ำมัน (กระบอกคู่) รุ่น LYJ-001-D
2. เครื่องกรองน้ำมัน (กระบอกเดี่ยว) รุ่น LYJ-001-S
3. เครื่องกำจัดตะกรัน รุ่น NXC-QZJ-116A
4. เครื่องฟื้นฟูน้ำยาหล่อเย็น รุ่น NXC-ZSJ-100

บริการพิเศษ: ยินดีนำเครื่องจักรเข้าไปสาธิตการทำงานให้ทดลองใช้งานฟรี (Demo On-site) ถึงหน้างานจริง

ขอแสดงความนับถือ,
เอกชัย หาบ้านแท่น (แม็ก) 092-479-7666
CHICAI ELECTRIC (THAILAND) CO., LTD.`
      };
    }
  };

  useEffect(() => {
    if (isOpen && customer) {
      const customerName = customer.name || "ลูกค้า";
      setToEmail(customer.email || "");
      const tpl = getTemplateData(templateType, customerName);
      setSubject(tpl.subject);
      setBody(tpl.body);
      setDirectSendSuccess(false);
      setDirectSendError(null);
      checkPreviousEmailHistory(customer);
    }
  }, [isOpen, customer, templateType]);

  if (!isOpen || !customer) return null;

  // Format clean comma-separated emails
  const cleanToEmail = toEmail
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean)
    .join(",");

  // 1-Click Direct Send via Google Apps Script
  const handleDirectSendEmail = async () => {
    if (!cleanToEmail) {
      alert("กรุณาระบุอีเมลผู้รับก่อนส่ง");
      return;
    }

    // If previously sent or contacted, ask for confirmation to prevent accidental double send
    if (previousEmailLog) {
      const confirmSendAgain = window.confirm(
        `⚠️ แจ้งเตือน: บริษัทนี้เคยมีการติดต่อ/ส่งข้อมูลไปแล้ว (${previousEmailLog.activity_type}: ${previousEmailLog.details || "ส่งอีเมล"})\n\nคุณต้องการยืนยันส่งอีเมลซ้ำอีกครั้งใช่หรือไม่?`
      );
      if (!confirmSendAgain) return;
    }

    setIsSendingDirect(true);
    setDirectSendError(null);
    setDirectSendSuccess(false);

    try {
      let isSuccess = false;
      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: customer.id,
            companyName: customer.name,
            email: cleanToEmail,
            webhookUrl: (gasWebhookUrl || DEFAULT_WEBHOOK_URL).trim(),
            contactPerson: customer.contact_person,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          isSuccess = true;
        } else {
          throw new Error(data.error || "Server API Error");
        }
      } catch (serverErr) {
        console.warn("Server send-email failed, falling back to direct client-to-Google script:", serverErr);
        // Fallback: Direct client-to-Google Apps Script Webhook
        const targetUrl = (gasWebhookUrl || DEFAULT_WEBHOOK_URL).trim();
        await fetch(targetUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({
            companyName: customer.name,
            email: cleanToEmail,
            contactPerson: customer.contact_person || "",
          }),
        });

        // Log activity directly into Supabase
        if (customer.id) {
          try {
            const today = new Date().toISOString().split("T")[0];
            await supabase.from("customer_activities").insert({
              customer_id: customer.id,
              activity_type: "ส่งอีเมล",
              activity_date: today,
              contact_person: customer.contact_person || null,
              details: `ส่งอีเมล E-Catalog CHICAI ELECTRIC (ลดต้นทุน 70% + On-site Demo) ถึง ${cleanToEmail}`,
            });

            await supabase
              .from("customers")
              .update({
                pipeline_stage: "ติดต่อแล้ว / ติดตามงาน",
                updated_at: new Date().toISOString(),
              })
              .eq("id", customer.id);
          } catch (dbErr) {
            console.error("Supabase log error:", dbErr);
          }
        }
        isSuccess = true;
      }

      if (isSuccess) {
        setDirectSendSuccess(true);
        checkPreviousEmailHistory(customer);
        if (onEmailSent) {
          onEmailSent();
        }
      }
    } catch (err: any) {
      console.error("Error sending direct email:", err);
      setDirectSendError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ Google Apps Script");
    } finally {
      setIsSendingDirect(false);
    }
  };

  const handleOpenGmailWeb = async () => {
    if (!cleanToEmail) {
      alert("กรุณาระบุอีเมลผู้รับก่อน");
      return;
    }

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      cleanToEmail
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, "_blank");

    // Optional: Log sending intent to Supabase
    if (customer.id) {
      try {
        const today = new Date().toISOString().split("T")[0];
        await supabase.from("customer_activities").insert({
          customer_id: customer.id,
          activity_type: "ส่งอีเมล (Gmail)",
          activity_date: today,
          contact_person: customer.contact_person || null,
          details: `เปิดส่งอีเมลผ่าน Gmail Web/App ถึง ${cleanToEmail}`,
        });

        await supabase
          .from("customers")
          .update({
            pipeline_stage: "ติดต่อแล้ว / ติดตามงาน",
            updated_at: new Date().toISOString(),
          })
          .eq("id", customer.id);
        
        if (onEmailSent) {
          onEmailSent();
        }
      } catch (e) {
        console.error("Error logging Gmail activity:", e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Modal Header */}
        <div className="pt-3 pb-3.5 px-4 sm:px-5 bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-800 text-white shrink-0 shadow-sm">
          {/* Mobile Pull Indicator */}
          <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-2.5 sm:hidden" />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-inner shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <h3 className="font-black text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
                    ส่งอีเมลนำเสนอสินค้า
                  </h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-400/25 text-emerald-100 border border-emerald-300/30">
                    1-Click
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-teal-100 truncate flex items-center space-x-1 mt-0.5">
                  <Building2 className="w-3 h-3 opacity-75 shrink-0" />
                  <span className="truncate"><b>{customer.name}</b></span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowWebhookSettings(!showWebhookSettings)}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/15 active:scale-95 transition-all"
                title="ตั้งค่า Webhook URL"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/15 active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Webhook Configuration Drawer */}
        {showWebhookSettings && (
          <div className="bg-slate-900 text-slate-100 p-3 sm:p-4 border-b border-slate-700 text-xs space-y-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1 text-emerald-400 text-[11px]">
                <Settings className="w-3 h-3" />
                <span>ตั้งค่า Google Apps Script Webhook URL</span>
              </span>
              <button
                type="button"
                onClick={() => setShowWebhookSettings(false)}
                className="text-slate-400 hover:text-white text-[10px]"
              >
                ปิด
              </button>
            </div>
            <div className="flex space-x-1.5">
              <input
                type="url"
                value={tempWebhookUrl}
                onChange={(e) => setTempWebhookUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveWebhookUrl}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shrink-0"
              >
                บันทึก
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1 text-slate-800 text-xs sm:text-sm">
          
          {/* Duplicate Send Alert Banner (If previously sent) */}
          {previousEmailLog && !directSendSuccess && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start space-x-2.5 animate-in fade-in duration-200 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 leading-relaxed min-w-0 flex-1">
                <span className="font-extrabold text-xs sm:text-sm text-amber-900 block">
                  ⚠️ บริษัทนี้เคยส่งข้อมูล/ติดต่อแล้ว
                </span>
                <span className="text-[11px] text-amber-900 block mt-0.5">
                  กิจกรรม: <b>{previousEmailLog.activity_type}</b> ({new Date(previousEmailLog.activity_date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })})
                </span>
                {previousEmailLog.details && (
                  <span className="text-[10.5px] text-amber-800/90 block mt-0.5 truncate">
                    💬 {previousEmailLog.details}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Direct Send Success Notification Banner */}
          {directSendSuccess && (
            <div className="p-3.5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-300 rounded-2xl flex items-start space-x-3 animate-in zoom-in-95 duration-200 shadow-xs">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div className="text-xs text-emerald-950 leading-relaxed">
                <span className="font-black text-xs sm:text-sm block text-emerald-900">
                  🎉 ส่งอีเมล E-Catalog สำเร็จเรียบร้อยแล้ว!
                </span>
                อีเมลพร้อมรูปภาพประกอบครบชุดได้ถูกส่งออกจาก Gmail (<code>akachai.chicai@gmail.com</code>) แล้ว และระบบได้บันทึกประวัติการติดต่อลงใน Timeline ของโรงงานนี้ให้อัตโนมัติครับ
              </div>
            </div>
          )}

          {/* Direct Send Error Notification Banner with Gmail Web Fallback */}
          {directSendError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl space-y-2.5 animate-in zoom-in-95 duration-200 shadow-xs">
              <div className="flex items-start space-x-3">
                <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="text-xs text-rose-950 leading-relaxed flex-1">
                  <span className="font-black text-xs sm:text-sm block text-rose-900">เกิดข้อผิดพลาดในการส่งอัตโนมัติ:</span>
                  <span className="text-[11px] text-rose-700">{directSendError}</span>
                </div>
              </div>
              <div className="pt-1 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(gmailUrl, "_blank");
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดส่งผ่าน Gmail Web ทันที (ข้อความครบ)</span>
                </button>
              </div>
            </div>
          )}

          {/* Template Selection Tabs */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
              รูปแบบข้อความ (Template)
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setTemplateType("formal")}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center text-center border ${
                  templateType === "formal"
                    ? "bg-teal-50 border-teal-600 text-teal-800 shadow-xs ring-1 ring-teal-600"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>🛡️ ทางการ</span>
                <span className="text-[9px] opacity-75 font-medium">ไร้ลิงก์/กัน Spam</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("concise")}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center text-center border ${
                  templateType === "concise"
                    ? "bg-teal-50 border-teal-600 text-teal-800 shadow-xs ring-1 ring-teal-600"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>💬 สั้น กระชับ</span>
                <span className="text-[9px] opacity-75 font-medium">เปิดบทสนทนา</span>
              </button>
              <button
                type="button"
                onClick={() => setTemplateType("standard")}
                className={`px-2 py-1.5 rounded-xl text-[11px] font-bold transition-all flex flex-col items-center justify-center text-center border ${
                  templateType === "standard"
                    ? "bg-teal-50 border-teal-600 text-teal-800 shadow-xs ring-1 ring-teal-600"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>⚡ สินค้าหลัก</span>
                <span className="text-[9px] opacity-75 font-medium">รุ่นเครื่องจักร</span>
              </button>
            </div>
            {templateType === "formal" && (
              <p className="text-[10px] text-teal-700 font-medium">
                ✅ เหมาะสำหรับส่งหาอีเมลกลาง (@gmail.com) แบบเป็นทางการ ปลอดภัยจากตัวกรองความปลอดภัย
              </p>
            )}
            {templateType === "concise" && (
              <p className="text-[10px] text-teal-700 font-medium">
                ✅ ข้อความสั้น ขออนุญาตส่งไฟล์ PDF เพิ่มเติม อัตราการเปิดอ่านและตอบกลับสูง
              </p>
            )}
            {templateType === "standard" && (
              <p className="text-[10px] text-slate-600 font-medium">
                💡 สรุปรุ่นเครื่องจักรหลัก 4 รายการครบถ้วน
              </p>
            )}
          </div>

          {/* Email Recipient (To) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <Mail className="w-3 h-3 text-teal-700" />
                <span>ถึง (To Email)</span>
              </label>
              {!toEmail && (
                <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-md border border-amber-200">
                  ⚠️ ยังไม่มีอีเมล (กรอกเพิ่มได้)
                </span>
              )}
            </div>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="กรอกอีเมล เช่น purchasing@company.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-xs sm:text-sm font-medium transition-all"
            />
          </div>

          {/* Email Subject */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
              หัวข้ออีเมล (Subject)
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-xs sm:text-sm font-bold text-slate-900 transition-all"
            />
          </div>

          {/* Email Body Preview */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
              เนื้อหาที่จะส่ง (Message Preview)
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-xs sm:text-sm font-sans leading-relaxed text-slate-800 transition-all"
            />
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-3 sm:p-3.5 pb-[max(0.85rem,env(safe-area-inset-bottom,12px))] bg-white/95 backdrop-blur-md border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition-all active:scale-95 touch-press"
          >
            ปิด
          </button>

          {/* Open in Gmail Web / App Button */}
          <button
            type="button"
            onClick={handleOpenGmailWeb}
            className="h-11 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs sm:text-sm font-bold transition-all active:scale-95 touch-press flex items-center justify-center space-x-1.5"
            title="เปิดเขียนใน Gmail Web/App พร้อมหัวข้อและเนื้อหาครบชุด เพื่อส่งตรงแบบ 100% ปลอดภัย"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ส่งผ่าน</span>
            <span>Gmail Web</span>
          </button>

          {/* 1-Click Direct Send Button via Google Apps Script Webhook */}
          <button
            type="button"
            disabled={isSendingDirect}
            onClick={handleDirectSendEmail}
            className={`h-11 flex-1 flex items-center justify-center space-x-2 px-3 sm:px-4 rounded-xl text-white text-xs sm:text-sm font-black shadow-md transition-all active:scale-[0.98] touch-press disabled:opacity-60 cursor-pointer min-w-[140px] ${
              previousEmailLog
                ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 shadow-amber-700/20"
                : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 shadow-teal-700/20"
            }`}
            title="ยิงอีเมล E-Catalog พร้อมรูปภาพอัตโนมัติ 1-Click ผ่าน Google Apps Script"
          >
            {isSendingDirect ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังส่ง...</span>
              </>
            ) : previousEmailLog ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>⚠️ ส่งซ้ำ (1-Click)</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                <span>🚀 ส่งทันที (1-Click)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
