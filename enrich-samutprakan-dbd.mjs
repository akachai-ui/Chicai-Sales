import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfgeuuweayziojpkcif.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAz8dU3ax8B_UuUUgEXW_xzt_YDSkbvHKw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanCompanyName(name) {
  if (!name) return '';
  return name
    .replace(/^บริษัท\s*/g, '')
    .replace(/^ห้างหุ้นส่วนจำกัด\s*/g, '')
    .replace(/^หจก\.\s*/g, '')
    .replace(/\s*จำกัด\s*(\(มหาชน\))?/g, '')
    .trim();
}

function stringSimilarity(s1, s2) {
  const c1 = cleanCompanyName(s1).toLowerCase().replace(/\s+/g, '');
  const c2 = cleanCompanyName(s2).toLowerCase().replace(/\s+/g, '');
  if (!c1 || !c2) return 0;
  if (c1 === c2) return 1.0;
  if (c1.includes(c2) || c2.includes(c1)) return 0.8;
  return 0.3;
}

async function enrichCompany(c) {
  const cleanName = cleanCompanyName(c.name);
  const district = c.district || '';
  const province = c.province || 'สมุทรปราการ';
  
  // 1. Try Google Places Text Search
  const query = `${c.name} ${district} ${province}`.trim();
  const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&language=th`;
  
  try {
    const pRes = await fetch(placesUrl);
    const pData = await pRes.json();
    
    if (pData.status === 'OK' && pData.results && pData.results.length > 0) {
      const topMatch = pData.results[0];
      const matchScore = stringSimilarity(c.name, topMatch.name);
      
      // If reasonably matched company name
      if (matchScore >= 0.7) {
        const placeId = topMatch.place_id;
        let phone = null;
        let website = null;
        
        if (placeId) {
          try {
            const dUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,website&key=${GOOGLE_KEY}&language=th`;
            const dRes = await fetch(dUrl);
            const dData = await dRes.json();
            if (dData.status === 'OK' && dData.result) {
              phone = dData.result.formatted_phone_number || dData.result.international_phone_number || null;
              website = dData.result.website || null;
            }
          } catch (err) {}
        }
        
        return {
          latitude: topMatch.geometry.location.lat,
          longitude: topMatch.geometry.location.lng,
          phone: phone,
          website: website,
          google_maps_url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
          place_id: placeId,
          geocoded_at: new Date().toISOString()
        };
      }
    }
  } catch (err) {}
  
  // 2. Fallback to Address Geocoding
  try {
    const fullAddress = `${c.address || ''} ${c.subdistrict ? 'ต.' + c.subdistrict : ''} ${c.district ? 'อ.' + c.district : ''} จ.${province} ${c.zipcode || ''}`.trim();
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_KEY}&language=th`;
    const gRes = await fetch(geoUrl);
    const gData = await gRes.json();
    
    if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
      const topGeo = gData.results[0];
      const lat = topGeo.geometry.location.lat;
      const lng = topGeo.geometry.location.lng;
      return {
        latitude: lat,
        longitude: lng,
        phone: null,
        website: null,
        google_maps_url: `https://www.google.com/maps?q=${lat},${lng}`,
        place_id: topGeo.place_id || null,
        geocoded_at: new Date().toISOString()
      };
    }
  } catch (err) {}

  // 3. Fallback to District level if address failed
  try {
    const fallbackAddr = `${district ? 'อำเภอ' + district : ''} จังหวัด${province}`.trim();
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fallbackAddr)}&key=${GOOGLE_KEY}&language=th`;
    const gRes = await fetch(geoUrl);
    const gData = await gRes.json();
    if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
      const topGeo = gData.results[0];
      const lat = topGeo.geometry.location.lat;
      const lng = topGeo.geometry.location.lng;
      return {
        latitude: lat,
        longitude: lng,
        phone: null,
        website: null,
        google_maps_url: `https://www.google.com/maps?q=${lat},${lng}`,
        place_id: topGeo.place_id || null,
        geocoded_at: new Date().toISOString()
      };
    }
  } catch (err) {}

  return null;
}

async function runEnrichment(totalLimit = 2500) {
  console.log(`🚀 Starting Samut Prakan Factory Geocoding & Contact Enrichment...`);
  
  const { count: remainingCount } = await supabase
    .from('dbd_companies')
    .select('*', { count: 'exact', head: true })
    .eq('province', 'สมุทรปราการ')
    .eq('industry_group', 'โรงงานอุตสาหกรรมการผลิต')
    .is('latitude', null);

  console.log(`📊 Remaining factories without coordinates: ${remainingCount}`);
  if (remainingCount === 0) {
    console.log(`✅ All factories are already enriched!`);
    return;
  }

  let totalProcessed = 0;
  let totalSuccess = 0;
  let totalPhones = 0;
  const BATCH_SIZE = 50;

  while (totalProcessed < totalLimit) {
    const fetchLimit = Math.min(BATCH_SIZE, totalLimit - totalProcessed);
    const { data: companies, error } = await supabase
      .from('dbd_companies')
      .select('id, tax_id, name, address, subdistrict, district, province, zipcode')
      .eq('province', 'สมุทรปราการ')
      .eq('industry_group', 'โรงงานอุตสาหกรรมการผลิต')
      .is('latitude', null)
      .limit(fetchLimit);

    if (error) {
      console.error('Fetch error:', error);
      break;
    }

    if (!companies || companies.length === 0) {
      console.log('No more companies left to enrich.');
      break;
    }

    console.log(`\n--- Processing Batch of ${companies.length} companies (${totalProcessed + 1} to ${totalProcessed + companies.length}) ---`);

    for (let i = 0; i < companies.length; i++) {
      const c = companies[i];
      const currentIdx = totalProcessed + i + 1;
      process.stdout.write(`[${currentIdx}/${remainingCount}] ${c.name.slice(0, 32)}... `);

      const enriched = await enrichCompany(c);
      if (enriched) {
        const { error: updateErr } = await supabase
          .from('dbd_companies')
          .update(enriched)
          .eq('id', c.id);

        if (updateErr) {
          console.log(`❌ Update Err: ${updateErr.message}`);
        } else {
          totalSuccess++;
          if (enriched.phone) totalPhones++;
          console.log(`✅ (${enriched.latitude.toFixed(4)}, ${enriched.longitude.toFixed(4)}) ${enriched.phone ? '📞 ' + enriched.phone : ''}`);
        }
      } else {
        console.log(`⚠️ Failed`);
      }

      await new Promise(r => setTimeout(r, 150));
    }

    totalProcessed += companies.length;
    console.log(`\nProgress: ${totalSuccess}/${totalProcessed} geocoded (${totalPhones} phones)`);
  }

  console.log(`\n========================================`);
  console.log(`🎉 Enrichment Complete!`);
  console.log(`   Total Processed: ${totalProcessed}`);
  console.log(`   Total Geocoded:  ${totalSuccess}`);
  console.log(`   Total Phones:    ${totalPhones}`);
  console.log(`========================================\n`);
}

runEnrichment(2500);
