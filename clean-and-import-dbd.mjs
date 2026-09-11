import fs from 'fs';
import { parquetRead, parquetMetadataAsync } from 'hyparquet';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfgeuuweayziojpkcif.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PARQUET_PATH = 'data/dbd_companies_all.parquet';

function cleanText(val) {
  if (!val) return null;
  const str = String(val).trim().replace(/\s+/g, ' ');
  return str.length > 0 ? str : null;
}

function getIndustryGroup(tsicCode, name, objective) {
  const codeStr = String(tsicCode || '').trim();
  const code2 = parseInt(codeStr.substring(0, 2), 10);
  const combined = ((name || '') + ' ' + (objective || '')).toLowerCase();

  // Manufacturing / Factory (TSIC 10 - 33)
  if (code2 >= 10 && code2 <= 33) {
    return 'โรงงานอุตสาหกรรมการผลิต';
  }

  // Wholesale / Retail (TSIC 45 - 47)
  if (code2 >= 45 && code2 <= 47) {
    return 'ค้าส่ง/ตัวแทนจำหน่าย';
  }

  // Check manufacturing keywords if TSIC is missing or broad
  if (
    combined.includes('โรงกลึง') ||
    combined.includes('แม่พิมพ์') ||
    combined.includes('ปั๊มโลหะ') ||
    combined.includes('ฉีดพลาสติก') ||
    combined.includes('ชิ้นส่วนยานยนต์')
  ) {
    return 'โรงงานอุตสาหกรรมการผลิต';
  }

  return 'บริการและอื่นๆ';
}

async function main() {
  console.log('🧹 Starting DBD Data Cleaning & Pipeline...');
  console.log(`📁 Reading Parquet: ${PARQUET_PATH}`);

  if (!fs.existsSync(PARQUET_PATH)) {
    console.error(`❌ File not found: ${PARQUET_PATH}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(PARQUET_PATH);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const meta = await parquetMetadataAsync(arrayBuffer);
  const totalRawRows = Number(meta.num_rows);
  console.log(`📊 Total raw rows in parquet: ${totalRawRows.toLocaleString()}`);

  let dissolvedSkipped = 0;
  let duplicateSkipped = 0;
  const uniqueCompanies = new Map();

  await parquetRead({
    file: arrayBuffer,
    onComplete: async (rows) => {
      console.log(`\n🔍 Analyzing & Filtering ${rows.length.toLocaleString()} rows...`);

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        // Dissolved check: column index 16
        const dissolvedDate = r[16];
        if (dissolvedDate && String(dissolvedDate).trim() !== '' && String(dissolvedDate).trim() !== 'null') {
          dissolvedSkipped++;
          continue; // Skip closed companies
        }

        const taxId = cleanText(r[3]);
        const name = cleanText(r[4]);
        if (!name) continue;

        const tsic = cleanText(r[7]);
        const objective = cleanText(r[8]);
        const industryGroup = getIndustryGroup(tsic, name, objective);

        const cleanRecord = {
          tax_id: taxId,
          name: name,
          registered_date: cleanText(r[5]),
          registered_capital: r[6] ? Number(r[6]) : 0,
          tsic_code: tsic,
          industry_group: industryGroup,
          objective: objective,
          address: cleanText(r[9]),
          subdistrict: cleanText(r[10]),
          district: cleanText(r[11]),
          province: cleanText(r[12]),
          zipcode: cleanText(r[13]),
          batch_year: r[14] ? Number(r[14]) : null,
          batch_month: r[15] ? Number(r[15]) : null,
        };

        const key = taxId || `NAME_${name}_${r[12]}`;
        if (uniqueCompanies.has(key)) {
          duplicateSkipped++;
        }
        uniqueCompanies.set(key, cleanRecord);
      }

      console.log('\n--- Cleaning Summary ---');
      console.log(`❌ Filtered Out Dissolved (ปิดกิจการ): ${dissolvedSkipped.toLocaleString()}`);
      console.log(`⚠️ Filtered Out Duplicates (รายการซ้ำ): ${duplicateSkipped.toLocaleString()}`);
      console.log(`✅ Total Clean Active Companies: ${uniqueCompanies.size.toLocaleString()}`);

      const cleanList = Array.from(uniqueCompanies.values());
      const BATCH_SIZE = 500;
      let insertedTotal = 0;
      let failedTotal = 0;
      let batch = [];

      const startTime = Date.now();
      console.log(`\n⏳ Streaming clean data into Supabase "dbd_companies"...`);

      for (let i = 0; i < cleanList.length; i++) {
        batch.push(cleanList[i]);

        if (batch.length >= BATCH_SIZE || i === cleanList.length - 1) {
          try {
            const { error } = await supabase.from('dbd_companies').insert(batch);
            if (error) {
              failedTotal += batch.length;
            } else {
              insertedTotal += batch.length;
            }
          } catch (err) {
            failedTotal += batch.length;
          }

          batch = [];

          const percent = (((i + 1) / cleanList.length) * 100).toFixed(1);
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(
            `\r[${percent}%] Clean Inserted: ${insertedTotal.toLocaleString()} | Failed: ${failedTotal.toLocaleString()} | Time: ${elapsedSec}s`
          );
        }
      }

      console.log(`\n\n🎉 Clean Import Complete!`);
      console.log(`- Successfully inserted: ${insertedTotal.toLocaleString()} clean companies`);
    },
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
});
