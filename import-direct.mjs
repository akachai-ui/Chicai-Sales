import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://alfgeuuweayziojpkcif.supabase.co';
const supabaseKey = 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';
const supabase = createClient(supabaseUrl, supabaseKey);

const csvPath = '/Users/akachai.h/.gemini/antigravity/brain/b7a93f8e-09bb-4aa2-af27-e40e4c2cdafc/.user_uploaded/media_1788755365995.csv';

function parseCSV(text) {
  // Simple robust CSV parser handling quotes, escaped quotes, newlines in quotes
  const lines = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  // Clean BOM
  const str = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const next = str[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cell += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (c === '\r') {
        // ignore CR
      } else if (c === '\n') {
        row.push(cell.trim());
        if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += c;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  return lines;
}

async function run() {
  console.log('Reading CSV from:', csvPath);
  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);

  console.log(`Total parsed lines: ${rows.length}`);
  const headers = rows[0];
  console.log('Headers:', headers);

  const mappedData = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = row[idx] || '';
    });

    const name = rowObj['ชื่อโรงงาน / บริษัท'];
    if (!name || !name.trim()) continue;

    const seq = parseInt(rowObj['ลำดับ']) || null;
    const phone = rowObj['เบอร์โทรศัพท์'] || null;
    const address = rowObj['ที่อยู่'] || null;
    const district = rowObj['อำเภอ/โซน'] || null;
    const province = rowObj['จังหวัด'] || null;
    const website = rowObj['เว็บไซต์ / ช่องทางติดต่อ'] || null;
    const google_maps_url = rowObj['Google Maps Link'] || null;
    const latitude = parseFloat(rowObj['ละติจูด (Lat)']) || null;
    const longitude = parseFloat(rowObj['ลองจิจูด (Lng)']) || null;
    const rating = parseFloat(rowObj['คะแนนรีวิว']) || null;
    const review_count = parseInt(rowObj['จำนวนรีวิว']) || 0;
    const business_type = rowObj['ประเภทธุรกิจ'] || null;
    const operating_status = rowObj['สถานะเปิดทำการ'] || null;
    const place_id = rowObj['Place ID'] || null;
    const pipeline_stage = rowObj['สถานะการโทร (Sales Pipeline)'] || 'ยังไม่ได้ติดต่อ';
    const contact_person = rowObj['ผู้ติดต่อ / ฝ่ายจัดซื้อ-ซ่อมบำรุง'] || null;
    const target_product = rowObj['สินค้าเป้าหมาย'] || null;
    const contact_result = rowObj['ผลการติดต่อ / นัดหมาย Demo On-site'] || null;
    const notes = rowObj['หมายเหตุเพิ่มเติม'] || null;
    const email = rowObj['อีเมลติดต่อ (Email)'] || null;

    mappedData.push({
      seq,
      name: name.trim(),
      phone,
      address,
      district,
      province,
      website,
      google_maps_url,
      latitude,
      longitude,
      rating,
      review_count,
      business_type,
      operating_status,
      place_id,
      pipeline_stage,
      contact_person,
      target_product,
      contact_result,
      notes,
      email,
    });
  }

  console.log(`Prepared ${mappedData.length} records for Supabase insertion.`);
  if (mappedData.length > 0) {
    console.log('Sample Record 1:', mappedData[0]);
    console.log('Sample Record Last:', mappedData[mappedData.length - 1]);
  }

  // Clear any existing test data
  console.log('Resetting/cleaning existing rows...');
  await supabase.from('customers').delete().neq('id', 0);

  // Insert in batches of 50
  const batchSize = 50;
  let totalInserted = 0;

  for (let i = 0; i < mappedData.length; i += batchSize) {
    const batch = mappedData.slice(i, i + batchSize);
    const { data, error } = await supabase.from('customers').insert(batch).select('id');
    if (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    } else {
      totalInserted += (data ? data.length : 0);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1} (${totalInserted}/${mappedData.length})`);
    }
  }

  const { count: finalCount } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  console.log(`\n========================================`);
  console.log(`✨ SUCCESS! Total customer records in Supabase: ${finalCount}`);
  console.log(`========================================\n`);
}

run().catch(console.error);
