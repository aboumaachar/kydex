const fetch = global.fetch || require('node-fetch');
const fs = require('fs');

async function poll() {
  const url = 'http://localhost:4000/api/v1/screen';
  const authUrl = 'http://localhost:4000/api/v1/auth/login';
  const ADMIN_EMAIL = process.env.KYDEX_ADMIN_EMAIL || 'admin@kydex.local';
  const ADMIN_PASS = process.env.KYDEX_ADMIN_PASS || 'KydexPass123!';

  // Authenticate first to receive a bearer token
  let token = '';
  try {
    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
    });
    if (authRes.ok) {
      const authBody = await authRes.json();
      token = authBody.accessToken || '';
      console.log('Authenticated for polling');
    } else {
      console.log('Auth failed', authRes.status);
    }
  } catch (err) {
    console.log('Auth error', err.message || err);
  }
  const payload = {
    fullName: 'Mohammad Ali',
    query: 'Mohammad Ali',
    screeningType: 'ofac',
    source: 'dashboard',
    liveVerify: false,
    sources: ['OFAC_SDN'],
  };

  const timeoutMs = 5 * 60 * 1000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        console.log('API returned', res.status);
      } else {
        const body = await res.json();
        const matches = body.matches || [];
        console.log('matches.length =', matches.length);
        if (Array.isArray(matches) && matches.length > 0) {
          console.log('FOUND');
          fs.writeFileSync('apps/web/e2e/artifacts/poll-result.json', JSON.stringify(body, null, 2));
          return 0;
        }
      }
    } catch (err) {
      console.log('error', err.message || err);
    }
    await new Promise((r) => setTimeout(r, 5000));
    console.log('waiting...');
  }
  console.log('TIMEOUT');
  return 2;
}

poll().then((code) => process.exit(code)).catch((e) => { console.error(e); process.exit(3); });
