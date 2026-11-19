const clientId = '50086376748-676lft8efht29skofqs9ouk3ic8nldue.apps.googleusercontent.com';

const testUris = [
  'https://web.decidixapp.tech',
  'https://web.decidixapp.tech/',
  'https://web.decidixapp.tech/login',
  'https://web.decidixapp.tech/auth/callback',
  'https://decidixapp.tech',
  'https://decidixapp.tech/',
  'https://decidix-web-staging.20912023100049.workers.dev',
  'https://decidix-web-staging.20912023100049.workers.dev/',
  'https://decidix-backend-staging-cfa3445b7c14.herokuapp.com/v1/auth/google/callback',
  'http://localhost:5173',
  'http://localhost:5173/'
];

async function checkUris() {
  console.log('Testing redirect_uris against Google OAuth 2.0 endpoint...\n');
  for (const uri of testUris) {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(uri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=123`;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      const location = res.headers.get('location') || '';
      
      const isMismatch = location.includes('redirect_uri_mismatch') || location.includes('error');
      const isNormalSignIn = location.includes('/v3/signin') || (location.includes('signin') && !location.includes('error'));
      
      console.log(`URI: ${uri}`);
      console.log(`Location: ${location.substring(0, 80)}...`);
      if (isMismatch) {
        console.log(`>>> REJECTED: redirect_uri_mismatch`);
      } else if (isNormalSignIn) {
        console.log(`>>> ACCEPTED! Direct to Google Sign-In prompt`);
      } else {
        console.log(`>>> UNKNOWN`);
      }
      console.log('---');
    } catch (e) {
      console.error(`URI ${uri} error:`, e.message);
    }
  }
}

checkUris();
