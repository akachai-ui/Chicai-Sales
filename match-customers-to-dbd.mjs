import fs from 'fs';
import { parquetRead } from 'hyparquet';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfgeuuweayziojpkcif.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function cleanName(name) {
  if (!name) return '';
  return name
    .replace(/^(บริษัท|บจก\.|หจก\.|ห้างหุ้นส่วนจำกัด)\s*/i, '')
    .replace(/\s*(จำกัด|มหาชน|\(มหาชน\)|co\.,?\s*ltd\.?|co\.,\s*ltd|company limited).*$/i, '')
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9]/g, '') // remove spaces & symbols for exact string match
    .trim()
    .toLowerCase();
}

async function main() {
  console.log('🔄 Starting Strict Exact Auto-Match: customers ➔ dbd_companies...');

  // 1. Reset all tax_id and dbd_company_id first to ensure 100% purity
  console.log('🧹 Resetting old links in customers...');
  await supabase.from('customers').update({ tax_id: null, dbd_company_id: null }).neq('id', 0);

  // 2. Fetch all customers
  let allCustomers = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, district, province')
      .order('id', { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) {
      console.error('Error fetching customers:', error);
      process.exit(1);
    }

    if (data && data.length > 0) {
      allCustomers = allCustomers.concat(data);
      if (data.length < batchSize) hasMore = false;
      else from += batchSize;
    } else {
      hasMore = false;
    }
  }

  console.log(`📊 Fetched ${allCustomers.length} customers from CRM.`);

  // 3. Read local parquet into memory Map
  const buffer = fs.readFileSync('data/dbd_companies_all.parquet');
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

  const dbdExactMap = new Map();
  await parquetRead({
    file: arrayBuffer,
    onComplete: (rows) => {
      for (const r of rows) {
        const rawName = r[4];
        const taxId = r[3];
        if (rawName && taxId) {
          const cName = cleanName(rawName);
          if (cName && !dbdExactMap.has(cName)) {
            dbdExactMap.set(cName, {
              tax_id: String(taxId).trim(),
              name: rawName,
              capital: r[6],
              objective: r[8],
              province: r[12],
              district: r[11]
            });
          }
        }
      }
    }
  });

  console.log(`📚 Indexed ${dbdExactMap.size.toLocaleString()} exact company keys from DBD.`);

  let matchMap = [];

  for (const cust of allCustomers) {
    const cName = cleanName(cust.name);
    if (!cName || cName.length < 3) continue;

    const match = dbdExactMap.get(cName);
    if (match) {
      matchMap.push({
        customerId: cust.id,
        customerName: cust.name,
        tax_id: match.tax_id,
        dbdName: match.name,
        capital: match.capital,
      });
    }
  }

  console.log(`\n🎯 Found ${matchMap.length} EXACT MATCHES! Resolving in Supabase...`);

  let updatedCount = 0;
  for (const m of matchMap) {
    const { data: dbdRows } = await supabase
      .from('dbd_companies')
      .select('id')
      .eq('tax_id', m.tax_id)
      .limit(1);

    const dbdId = dbdRows && dbdRows[0] ? dbdRows[0].id : null;

    if (dbdId) {
      const { error: updateErr } = await supabase
        .from('customers')
        .update({
          tax_id: m.tax_id,
          dbd_company_id: dbdId,
          updated_at: new Date().toISOString()
        })
        .eq('id', m.customerId);

      if (!updateErr) {
        updatedCount++;
        console.log(`✅ [CRM #${m.customerId} ${m.customerName}] ➔ DBD #${dbdId} (${m.tax_id}) | ทุน: ${Number(m.capital || 0).toLocaleString()} บาท`);
      }
    }
  }

  console.log(`\n🎉 Strict Match Complete! Successfully linked ${updatedCount} exact matching companies.`);
}

main().catch(console.error);
