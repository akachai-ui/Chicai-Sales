const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://alfgeuuweayziojpkcif.supabase.co',
  'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv'
);

function cleanCompanyName(raw) {
  if (!raw) return '';
  return raw
    .replace(/^บริษัท\s*/gi, '')
    .replace(/^บจก\.?\s*/gi, '')
    .replace(/^หจก\.?\s*/gi, '')
    .replace(/^ห้างหุ้นส่วนจำกัด\s*/gi, '')
    .replace(/\s*จำกัด\s*(\(มหาชน\))?/gi, '')
    .replace(/co\.?,?\s*ltd\.?/gi, '')
    .replace(/company\s*limited/gi, '')
    .replace(/\(thailand\)/gi, '')
    .replace(/\(ประเทศไทย\)/gi, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[|•-].*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function runMerge() {
  console.log('🚀 Starting Data Merge: CRM Customers -> DBD Master Companies...');

  // 1. Fetch all customers
  let allCustomers = [];
  let from = 0;
  while (true) {
    const { data } = await supabase.from('customers').select('*').range(from, from + 999);
    if (!data || data.length === 0) break;
    allCustomers = allCustomers.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`📦 Loaded ${allCustomers.length} CRM customers`);

  // 2. Fetch all Samut Prakan DBD companies
  let allDbd = [];
  from = 0;
  while (true) {
    const { data } = await supabase
      .from('dbd_companies')
      .select('*')
      .eq('province', 'สมุทรปราการ')
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    allDbd = allDbd.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`🏢 Loaded ${allDbd.length} Samut Prakan DBD companies`);

  // Build clean name index for DBD
  const dbdCleanMap = new Map();
  allDbd.forEach((d) => {
    const clean = cleanCompanyName(d.name).toLowerCase();
    if (clean) {
      if (!dbdCleanMap.has(clean)) dbdCleanMap.set(clean, []);
      dbdCleanMap.get(clean).push(d);
    }
  });

  let mergedCount = 0;
  let deletedFromCrmCount = 0;
  const mergedDetails = [];

  for (const cust of allCustomers) {
    let matchedDbd = null;

    // Check direct IDs first
    if (cust.dbd_company_id) {
      matchedDbd = allDbd.find((d) => d.id === cust.dbd_company_id);
    } else if (cust.tax_id) {
      matchedDbd = allDbd.find((d) => d.tax_id === cust.tax_id.trim());
    }

    // Check clean name match
    if (!matchedDbd) {
      const cleanCust = cleanCompanyName(cust.name).toLowerCase();
      if (cleanCust && cleanCust.length >= 3) {
        const candidates = dbdCleanMap.get(cleanCust);
        if (candidates && candidates.length > 0) {
          if (candidates.length === 1) {
            matchedDbd = candidates[0];
          } else {
            const districtMatch = candidates.find((cand) => cand.district === cust.district);
            matchedDbd = districtMatch || candidates[0];
          }
        }
      }
    }

    if (matchedDbd) {
      // 1. Enrich DBD company row
      const dbdUpdate = {};
      if ((!matchedDbd.phone || matchedDbd.phone.trim() === '') && cust.phone) {
        dbdUpdate.phone = cust.phone;
      }
      if ((!matchedDbd.website || matchedDbd.website.trim() === '') && cust.website) {
        dbdUpdate.website = cust.website;
      }
      if (!matchedDbd.google_maps_url && cust.google_maps_url) {
        dbdUpdate.google_maps_url = cust.google_maps_url;
      }
      if (cust.latitude && cust.longitude && matchedDbd.pin_type !== 'GOOGLE_BUSINESS') {
        dbdUpdate.latitude = cust.latitude;
        dbdUpdate.longitude = cust.longitude;
        dbdUpdate.pin_type = 'GOOGLE_BUSINESS';
      }

      if (Object.keys(dbdUpdate).length > 0) {
        await supabase.from('dbd_companies').update(dbdUpdate).eq('id', matchedDbd.id);
      }

      // 2. Check if customer has activities
      const { data: acts } = await supabase
        .from('customer_activities')
        .select('id')
        .eq('customer_id', cust.id);

      if (!acts || acts.length === 0) {
        const { error: delErr } = await supabase.from('customers').delete().eq('id', cust.id);
        if (!delErr) {
          deletedFromCrmCount++;
        }
      } else {
        await supabase
          .from('customers')
          .update({
            dbd_company_id: matchedDbd.id,
            tax_id: matchedDbd.tax_id,
            registered_capital: matchedDbd.registered_capital,
          })
          .eq('id', cust.id);
      }

      mergedCount++;
      mergedDetails.push({
        crmName: cust.name,
        dbdName: matchedDbd.name,
        taxId: matchedDbd.tax_id,
        phone: cust.phone || matchedDbd.phone,
      });
    }
  }

  console.log('--- Merge Summary ---');
  console.log(`✅ Total matched & enriched in DBD: ${mergedCount}`);
  console.log(`🗑️ Redundant duplicate rows cleaned from customers table: ${deletedFromCrmCount}`);
  console.log(`🧑‍💼 Remaining unique customers in customers table: ${allCustomers.length - deletedFromCrmCount}`);

  console.log('\nMerged companies:');
  mergedDetails.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.crmName}] -> [${m.dbdName}] (Tax ID: ${m.taxId}) | Phone: ${m.phone || '-'}`);
  });
}

runMerge();
