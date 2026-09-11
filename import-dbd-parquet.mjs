import fs from 'fs';
import { parquetRead, parquetMetadataAsync } from 'hyparquet';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfgeuuweayziojpkcif.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PARQUET_PATH = 'data/dbd_companies_all.parquet';

async function main() {
  console.log('🚀 Starting DBD Companies Import to Supabase...');
  console.log(`📁 Reading: ${PARQUET_PATH}`);

  if (!fs.existsSync(PARQUET_PATH)) {
    console.error(`❌ File not found: ${PARQUET_PATH}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(PARQUET_PATH);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const meta = await parquetMetadataAsync(arrayBuffer);
  const totalRows = Number(meta.num_rows);
  console.log(`📊 Total rows in parquet file: ${totalRows.toLocaleString()}`);

  // Test table existence
  const { error: testErr } = await supabase.from('dbd_companies').select('id').limit(1);
  if (testErr) {
    console.error('\n❌ Table "dbd_companies" does not exist in Supabase yet.');
    console.error('👉 Please run the SQL in "supabase-dbd-companies-schema.sql" in your Supabase SQL Editor first!');
    console.error('Error detail:', testErr.message);
    process.exit(1);
  }

  console.log('✅ Connected to Supabase table "dbd_companies"');

  const BATCH_SIZE = 500;
  let insertedTotal = 0;
  let skippedTotal = 0;

  await parquetRead({
    file: arrayBuffer,
    onComplete: async (rows) => {
      console.log(`\n⏳ Preparing to insert ${rows.length.toLocaleString()} records in batches of ${BATCH_SIZE}...`);
      
      let batch = [];
      const startTime = Date.now();

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        
        // Mapping schema:
        // [0]: record_id, [1]: เดือน, [2]: ปี, [3]: เลขทะเบียน, [4]: ชื่อนิติบุคคล, [5]: วันที่จดทะเบียน
        // [6]: ทุนจดทะเบียน, [7]: รหัสวัตถุประสงค์, [8]: วัตถุประสงค์, [9]: ที่ตั้งสำนักงานใหญ่
        // [10]: ตำบล, [11]: อำเภอ, [12]: จังหวัด, [13]: รหัสไปรษณีย์, [14]: batch_year, [15]: batch_month
        const record = {
          tax_id: r[3] ? String(r[3]).trim() : null,
          name: r[4] ? String(r[4]).trim() : 'ไม่ระบุชื่อ',
          registered_date: r[5] ? String(r[5]).trim() : null,
          registered_capital: r[6] ? Number(r[6]) : 0,
          tsic_code: r[7] ? String(r[7]).trim() : null,
          objective: r[8] ? String(r[8]).trim() : null,
          address: r[9] ? String(r[9]).trim() : null,
          subdistrict: r[10] ? String(r[10]).trim() : null,
          district: r[11] ? String(r[11]).trim() : null,
          province: r[12] ? String(r[12]).trim() : null,
          zipcode: r[13] ? String(r[13]).trim() : null,
          batch_year: r[14] ? Number(r[14]) : null,
          batch_month: r[15] ? Number(r[15]) : null,
        };

        batch.push(record);

        if (batch.length >= BATCH_SIZE || i === rows.length - 1) {
          try {
            const { error } = await supabase.from('dbd_companies').insert(batch);
            if (error) {
              console.warn(`\n⚠️ Batch error at row ${i + 1}:`, error.message);
              skippedTotal += batch.length;
            } else {
              insertedTotal += batch.length;
            }
          } catch (batchErr) {
            console.warn(`\n⚠️ Failed to send batch:`, batchErr.message);
            skippedTotal += batch.length;
          }

          batch = [];

          const percent = ((i + 1) / rows.length * 100).toFixed(1);
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          process.stdout.write(`\r[${percent}%] Inserted: ${insertedTotal.toLocaleString()} | Skipped: ${skippedTotal.toLocaleString()} | Time: ${elapsedSec}s`);
        }
      }

      console.log(`\n\n🎉 Import Complete!`);
      console.log(`- Successfully inserted: ${insertedTotal.toLocaleString()} companies`);
      if (skippedTotal > 0) console.log(`- Skipped/Failed: ${skippedTotal.toLocaleString()}`);
    }
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
});
