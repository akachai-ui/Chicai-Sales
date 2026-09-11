import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alfgeuuweayziojpkcif.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv';
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyAz8dU3ax8B_UuUUgEXW_xzt_YDSkbvHKw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testSample() {
  const { data: companies, error } = await supabase
    .from('dbd_companies')
    .select('id, tax_id, name, address, subdistrict, district, province, zipcode, objective')
    .eq('province', 'สมุทรปราการ')
    .eq('industry_group', 'โรงงานอุตสาหกรรมการผลิต')
    .is('latitude', null)
    .limit(5);

  if (error) {
    console.error('Fetch error:', error);
    return;
  }

  console.log(`Testing enrichment on ${companies.length} sample companies:\n`);

  for (const c of companies) {
    console.log(`--------------------------------------------------`);
    console.log(`🏢 ID ${c.id}: ${c.name}`);
    console.log(`📍 DBD Address: ${c.address || ''} ต.${c.subdistrict || ''} อ.${c.district || ''} จ.${c.province || ''}`);

    // 1. Try Places API TextSearch
    const query = `${c.name} ${c.district || ''} ${c.province || ''}`.trim();
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}&language=th`;
    
    const pRes = await fetch(placesUrl);
    const pData = await pRes.json();

    if (pData.status === 'OK' && pData.results && pData.results.length > 0) {
      const topMatch = pData.results[0];
      const lat = topMatch.geometry.location.lat;
      const lng = topMatch.geometry.location.lng;
      const placeId = topMatch.place_id;
      const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;

      console.log(`✅ Found on Google Maps:`);
      console.log(`   Name: ${topMatch.name}`);
      console.log(`   Address: ${topMatch.formatted_address}`);
      console.log(`   Pin: (${lat}, ${lng})`);
      console.log(`   Rating: ${topMatch.rating || 'N/A'} ⭐ (${topMatch.user_ratings_total || 0} reviews)`);
      console.log(`   Maps Link: ${mapsUrl}`);

      // Optionally fetch Place Details for phone & website
      if (placeId) {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,website&key=${GOOGLE_KEY}&language=th`;
        const dRes = await fetch(detailsUrl);
        const dData = await dRes.json();
        if (dData.status === 'OK' && dData.result) {
          console.log(`   📞 Phone: ${dData.result.formatted_phone_number || 'N/A'}`);
          console.log(`   🌐 Website: ${dData.result.website || 'N/A'}`);
        }
      }
    } else {
      console.log(`ℹ️ Not found directly in Google Places, trying Geocoding by full address...`);
      const fullAddress = `${c.address || ''} ${c.subdistrict || ''} ${c.district || ''} ${c.province || ''} ${c.zipcode || ''}`.trim();
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${GOOGLE_KEY}&language=th`;
      const gRes = await fetch(geoUrl);
      const gData = await gRes.json();

      if (gData.status === 'OK' && gData.results && gData.results.length > 0) {
        const topGeo = gData.results[0];
        const lat = topGeo.geometry.location.lat;
        const lng = topGeo.geometry.location.lng;
        console.log(`📍 Geocoded Address Pin: (${lat}, ${lng})`);
        console.log(`   Formatted Address: ${topGeo.formatted_address}`);
      } else {
        console.log(`⚠️ Geocoding failed for this address.`);
      }
    }
    
    // small delay
    await new Promise(r => setTimeout(r, 400));
  }
}

testSample();
