const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const url = require('url');

const supabase = createClient(
  'https://alfgeuuweayziojpkcif.supabase.co',
  'sb_publishable_bgMAR2_yaXgp9AsxdeZY3Q_iqm9OXlv'
);

const IGNORED_DOMAINS = [
  'sentry.io', 'wixpress.com', 'wix.com', 'wordpress.com', 'example.com',
  'domain.com', 'email.com', 'yourdomain.com', 'name@email.com', 'test.com',
  'google.com', 'facebook.com', 'schema.org', 'w3.org'
];

const IGNORED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css'];

function cleanEmail(e) {
  if (!e) return null;
  let email = e.trim().toLowerCase();
  email = email.replace(/^[^\w]+|[^\w]+$/g, '');

  if (email.length < 6 || !email.includes('@') || !email.includes('.')) return null;

  for (const ext of IGNORED_EXTENSIONS) {
    if (email.endsWith(ext)) return null;
  }

  const domain = email.split('@')[1];
  if (!domain || IGNORED_DOMAINS.some(d => domain.includes(d))) return null;

  return email;
}

function fetchPage(pageUrl, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const parsed = url.parse(pageUrl);
      if (!parsed.protocol || !parsed.hostname) return resolve(null);

      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(
        pageUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'th,en-US;q=0.9,en;q=0.8',
          },
          timeout,
          rejectUnauthorized: false,
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectUrl = url.resolve(pageUrl, res.headers.location);
            return fetchPage(redirectUrl, timeout).then(resolve);
          }

          if (res.statusCode !== 200) return resolve(null);

          let data = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            data += chunk;
            if (data.length > 500000) {
              res.destroy();
              resolve(data);
            }
          });
          res.on('end', () => resolve(data));
          res.on('error', () => resolve(null));
        }
      );

      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

function extractEmailsFromHtml(html) {
  if (!html) return [];
  const regex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = html.match(regex) || [];
  
  const mailtoRegex = /mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let match;
  while ((match = mailtoRegex.exec(html)) !== null) {
    matches.push(match[1]);
  }

  const valid = [];
  const seen = new Set();

  for (const raw of matches) {
    const cleaned = cleanEmail(raw);
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      valid.push(cleaned);
    }
  }

  valid.sort((a, b) => {
    const scoreA = getEmailPriority(a);
    const scoreB = getEmailPriority(b);
    return scoreB - scoreA;
  });

  return valid;
}

function getEmailPriority(email) {
  if (email.startsWith('sales@')) return 10;
  if (email.startsWith('info@')) return 9;
  if (email.startsWith('contact@')) return 8;
  if (email.startsWith('purchasing@') || email.startsWith('purchase@')) return 7;
  if (email.startsWith('marketing@')) return 6;
  if (email.startsWith('admin@')) return 5;
  return 1;
}

async function scrapeSingleCompany(comp) {
  let siteUrl = comp.website.trim();
  if (!siteUrl.startsWith('http')) {
    siteUrl = 'http://' + siteUrl;
  }

  if (siteUrl.includes('facebook.com') || siteUrl.includes('line.me')) {
    return null;
  }

  const commonSubPaths = ['', '/contact', '/contact-us', '/contactus', '/about', '/th/contact', '/contact.html', '/contact.php'];
  let foundEmails = [];

  for (const sub of commonSubPaths) {
    const targetUrl = url.resolve(siteUrl, sub);
    const html = await fetchPage(targetUrl, 4000);
    if (html) {
      const emails = extractEmailsFromHtml(html);
      if (emails.length > 0) {
        foundEmails = emails;
        break;
      }
    }
  }

  if (foundEmails.length > 0) {
    const topEmail = foundEmails[0];
    console.log(`✅ [${comp.name}] -> ${topEmail}`);
    // Update in Supabase
    await supabase.from('dbd_companies').update({ email: topEmail }).eq('id', comp.id);
    return { id: comp.id, name: comp.name, email: topEmail, website: comp.website };
  }
  return null;
}

async function runFastScraper() {
  console.log('🚀 Running High-Speed Concurrent Email Scraper for DBD Companies...\n');

  const { data: companies, error } = await supabase
    .from('dbd_companies')
    .select('id, name, website, phone')
    .eq('province', 'สมุทรปราการ')
    .not('website', 'is', null)
    .neq('website', '');

  if (error || !companies) {
    console.error('Error fetching companies:', error);
    return;
  }

  console.log(`📦 Scanning ${companies.length} DBD companies in parallel...\n`);

  const concurrency = 8;
  const results = [];

  for (let i = 0; i < companies.length; i += concurrency) {
    const batch = companies.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((c) => scrapeSingleCompany(c)));
    batchResults.filter(Boolean).forEach((r) => results.push(r));
    console.log(`⏳ Processed ${Math.min(i + concurrency, companies.length)} / ${companies.length} sites...`);
  }

  console.log('\n========================================');
  console.log(`🎉 COMPLETED! Found and saved ${results.length} valid business emails in dbd_companies`);
  console.log('========================================\n');

  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.name}] -> ✉️  ${r.email}`);
  });
}

runFastScraper();
